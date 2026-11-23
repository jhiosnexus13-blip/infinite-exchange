"""v120: flatten the LIDAR DTM under mapped town features so OSM buildings / roads / parks / beach
(all drawn at y~0) sit ON the ground instead of floating or sinking. Water polygons are kept at or below
-0.6 m so the flat water surfaces (y 0.06) never z-fight. Outside the feathered town mask the real LIDAR
relief is untouched (dunes, marsh, fields). Writes assets/img/gy-dtm-v120.png + gy-dtm-v120-lite.png;
the originals stay for IE_V120_FLAT=false."""
import json, math
from PIL import Image, ImageDraw, ImageFilter
ORG=(52.6035,1.7365,3.532); B=(1.7128,52.5691,1.7498,52.6469); HMIN,HMAX,SINK=-8,16,0.12
ME=111320*math.cos(math.radians(ORG[0])); MN=110540
G=json.load(open('assets/data/yarmouth-geo.json'))
X=json.load(open('assets/data/newtown-streets.json')); V=json.load(open('assets/data/v85-geo.json'))
flat=lambda L:[c for p in L for c in p]
def bake(src,dst):
    im=Image.open(src).convert('RGB'); W,H=im.size; S=4  # supersample masks
    def P(e,n):
        u=(ORG[1]+e/ME-B[0])/(B[2]-B[0]); v=(ORG[0]+n/MN-B[1])/(B[3]-B[1])
        return (u*(W-1)*S, (1-v)*(H-1)*S)
    pxm=(B[2]-B[0])*ME/W  # metres per pixel
    land=Image.new('L',(W*S,H*S),0); wat=Image.new('L',(W*S,H*S),0)
    dl=ImageDraw.Draw(land); dw=ImageDraw.Draw(wat)
    pts=lambda a:[P(a[i],a[i+1]) for i in range(0,len(a)-1,2)]
    for _,a in G['buildings']:
        q=pts(a)
        if len(q)>2: dl.polygon(q,fill=255)
    for cls,a in G['roads']:
        q=pts(a); w=max(1,int((14 if cls>=2 else 10)/pxm*S))
        if len(q)>1: dl.line(q,fill=255,width=w)
    for a in G['beach']+G['green']:
        q=pts(a)
        if len(q)>2: dl.polygon(q,fill=255)
    for ls in X['roads'].values():
        for a in ls:
            q=pts(a)
            if len(q)>1: dl.line(q,fill=255,width=max(1,int(10/pxm*S)))
    for a in X['buildings']+[V['joyland']]:
        a=flat(a) if a and isinstance(a[0],list) else a; q=pts(a)
        if len(q)>2: dl.polygon(q,fill=255)
    for a in G['water']:
        q=pts(a)
        if len(q)>2: dw.polygon(q,fill=255)
    land=land.resize((W,H),Image.BOX); wat=wat.resize((W,H),Image.BOX)
    # dilate ~15 m then feather ~20 m
    r=max(1,round(15/pxm)); land=land.filter(ImageFilter.MaxFilter(2*r+1)).filter(ImageFilter.GaussianBlur(20/pxm/2))
    wat=wat.filter(ImageFilter.MaxFilter(3))
    tl=round((ORG[2]+SINK-0.08-HMIN)/(HMAX-HMIN)*255); tw=round((ORG[2]+SINK-0.6-HMIN)/(HMAX-HMIN)*255)
    p=im.load(); L=land.load(); Wm=wat.load(); ch=0
    for y in range(H):
        for x in range(W):
            r0,g0,b0=p[x,y]; m=min(1,L[x,y]/255*1.6); r=r0
            if m>0: r=round(r0*(1-m)+tl*m)
            if Wm[x,y]>40: r=min(r,tw)
            if r!=r0: p[x,y]=(r,g0,b0); ch+=1
    im.save(dst,optimize=True); print(dst,W,H,'px/m',round(pxm,2),'changed',ch,'of',W*H)
bake('assets/img/gy-dtm.png','assets/img/gy-dtm-v120.png')
bake('assets/img/gy-dtm-lite.png','assets/img/gy-dtm-v120-lite.png')
