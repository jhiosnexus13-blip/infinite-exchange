# v121: run from tools/ after extract-roads-v121.py (writes roads_raw.json next to it). Paths below are absolute to the box checkout; adjust if moved.
import json, math
from shapely.geometry import Polygon, Point
from shapely.strtree import STRtree
R=json.load(open(__import__('os').path.join(__import__('os').path.dirname(__file__) or '.','roads_raw.json')))
G=json.load(open('/workspace/infinite-exchange/assets/data/yarmouth-geo.json'))
polys=[]
for h,a in G['buildings']:
    q=[(a[i],a[i+1]) for i in range(0,len(a)-1,2)]
    if len(q)>=3:
        p=Polygon(q)
        if p.is_valid and p.area>4: polys.append(p.buffer(-0.8))
tree=STRtree(polys)
BASE={'trunk':10,'primary':9,'secondary':8,'tertiary':7,'unclassified':6,'residential':5.5,'living_street':4.5,'service':3.5,'pedestrian':5,
      'trunk_link':6,'primary_link':6,'secondary_link':6,'tertiary_link':5.5}
CODE={'trunk':5,'primary':5,'secondary':4,'tertiary':3,'unclassified':2,'residential':2,'living_street':1,'service':1,'pedestrian':0,
      'trunk_link':4,'primary_link':4,'secondary_link':4,'tertiary_link':3}
def num(s):
    try: return float(str(s).split(';')[0].replace('m','').strip())
    except: return None
names=[]; nid={}; out=[]; stats={'ways':0,'drop_inside_bldg':0,'segs':0,'width_tag':0,'lanes':0,'bridge_kept':0}
ends={}
for r in R:
    pts=r['pts']
    if len(pts)<2: continue
    hw=r['hw']; w=BASE[hw]
    if hw=='service' and r['service']=='alley': w=2.8
    wt=num(r['width']); ln=num(r['lanes'])
    if wt and 2<wt<25: w=wt; stats['width_tag']+=1
    elif ln and 0<ln<7: w=max(w if r['oneway']!='yes' else 0, ln*3.2); stats['lanes']+=1
    elif r['oneway']=='yes' and hw in('residential','unclassified','tertiary'): w=min(w,4.5)
    # drop service/pedestrian ways whose midpoints sit inside building footprints (OSM/geo mismatch) -> keep runs outside
    if hw in('service','pedestrian','living_street'):
        keep=[]; cur=[pts[0]]
        for a,b in zip(pts,pts[1:]):
            m=Point((a[0]+b[0])/2,(a[1]+b[1])/2)
            inside=any(polys[i].contains(m) for i in tree.query(m))
            if inside:
                stats['drop_inside_bldg']+=1
                if len(cur)>1: keep.append(cur)
                cur=[b]
            else: cur.append(b)
        if len(cur)>1: keep.append(cur)
    else: keep=[pts]
    # v121: fit width to the real street gap between OSM building fronts (GY Rows / terraces are narrower than class defaults)
    if CODE[hw]<=2:
        ds=[]
        for a,b in zip(pts,pts[1:]):
            m=Point((a[0]+b[0])/2,(a[1]+b[1])/2)
            near=[polys[i] for i in tree.query(m.buffer(12))]
            d=min([p.distance(m) for p in near if not p.contains(m)] or [99])
            ds.append(d)
        ds.sort(); dm=ds[len(ds)//2]
        if dm<w/2+0.3: w=max(2.2,round(2*dm-0.3,1)); stats['narrowed']=stats.get('narrowed',0)+1
        nopave = dm < w/2+1.2
    else: nopave=False
    nm=r['name'] or r['ref']
    if nm not in nid: nid[nm]=len(names); names.append(nm)
    for k in keep:
        out.append([CODE[hw],round(w,1),(1 if r['bridge'] else 0)|(2 if r['oneway'] in ('yes','1','-1') else 0)|(4 if nopave else 0),nid[nm],[c for p in k for c in p]])
        stats['ways']+=1; stats['segs']+=len(k)-1
        for p in (k[0],k[-1]): key=(round(p[0]),round(p[1])); ends[key]=ends.get(key,0)+1
        for p in k[1:-1]: key=(round(p[0]),round(p[1])); ends[key]=ends.get(key,0)+2 if key in ends else ends.get(key,0)
# junctions: any rounded point touched by >=2 way ends, or an end landing on another way's interior vertex
vert={}
for o in out:
    a=o[4]
    for i in range(0,len(a),2): vert.setdefault((round(a[i]),round(a[i+1])),set()).add(id(o))
J=[[k[0],k[1]] for k,s in vert.items() if len(s)>=2]
json.dump({'src':'OpenStreetMap contributors (ODbL), Geofabrik Norfolk extract; highway ways in GY town, simplified 0.4 m; v121',
  'flags':'1 bridge, 2 oneway, 4 no pavement (tight street)','cls':'5 trunk/primary, 4 secondary/links, 3 tertiary, 2 residential/unclassified, 1 service/living, 0 pedestrian','names':names,'roads':out,'junctions':[c for p in J for c in p]},
  open('/workspace/infinite-exchange/assets/data/gy-roads-v121.json','w'),separators=(',',':'))
stats['junctions']=len(J); stats['named']=len([n for n in names if n]); print(stats)
