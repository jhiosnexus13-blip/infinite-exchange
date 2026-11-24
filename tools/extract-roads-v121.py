import osmium, json, math
from shapely.geometry import LineString, box
OLAT,OLON=52.6035,1.7365; KX=math.cos(math.radians(OLAT))*111320; KY=110540
def P(lon,lat): return ((lon-OLON)*KX,(lat-OLAT)*KY)
BB=box(-1700,-3800,900,4700)
KEEP={'motorway','trunk','primary','secondary','tertiary','unclassified','residential','living_street','service','pedestrian','trunk_link','primary_link','secondary_link','tertiary_link'}
R=[]; cnt={}
class H(osmium.SimpleHandler):
    def way(s,w):
        t=w.tags; hw=t.get('highway')
        if hw not in KEEP: return
        if hw=='service' and t.get('service') in ('parking_aisle','drive-through','driveway'): return
        if t.get('area')=='yes' or t.get('tunnel') in ('yes','building_passage'): return
        try: pts=[P(n.lon,n.lat) for n in w.nodes]; ids=[n.ref for n in w.nodes]
        except Exception: return
        if len(pts)<2: return
        g=LineString(pts).intersection(BB)
        if g.is_empty: return
        for l in getattr(g,'geoms',[g]):
            if l.geom_type!='LineString': continue
            l=l.simplify(0.4)
            R.append({'id':w.id,'hw':hw,'name':t.get('name',''),'ref':t.get('ref',''),'width':t.get('width',''),'lanes':t.get('lanes',''),'oneway':t.get('oneway',''),
              'bridge':t.get('bridge',''),'layer':t.get('layer',''),'service':t.get('service',''),'pts':[[round(x,1),round(y,1)] for x,y in l.coords]})
            cnt[hw]=cnt.get(hw,0)+1
H().apply_file('/workspace/osm/norfolk.osm.pbf',locations=True)
json.dump(R,open(__import__('os').path.join(__import__('os').path.dirname(__file__) or '.','roads_raw.json'),'w'))
print(len(R),cnt); print('named',len({r['name'] for r in R if r['name']}),'width tags',sum(1 for r in R if r['width']),'bridges',[ (r['name'],r['hw']) for r in R if r['bridge']][:20])
