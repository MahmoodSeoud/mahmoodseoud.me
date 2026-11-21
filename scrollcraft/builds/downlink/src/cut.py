# Cuts the satellite out of the DISCO-2 orbit render and rebuilds the plate behind it.
import cv2, numpy as np, sys
S = 0.6
src = cv2.imread('../../../assets/DISCO_2_orbit_foldout_v2_630_4x3.jpg')
img = cv2.resize(src, None, fx=S, fy=S, interpolation=cv2.INTER_AREA)
H, W = img.shape[:2]
def P(pts): return np.array([[(x+500)*S, (y+1000)*S] for x, y in pts], np.int32)
poly = P([(57,735),(672,315),(995,500),(1085,430),(1112,415),(1125,425),(1308,645),(1300,690),
          (1597,838),(1105,1142),(975,1085),(905,1058),(725,1167),(500,905),(290,820)])
lines = [((1110,418),(1158,118)), ((1300,640),(1490,450)), ((1100,570),(1270,535)), ((1310,800),(1620,860))]
base = np.zeros((H,W), np.uint8); cv2.fillPoly(base, [poly], 255)
k = lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2*r+1, 2*r+1))
B = int(16*S)
inner = cv2.erode(base, k(B)); outer = cv2.dilate(base, k(B))
lum = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
dark = (cv2.GaussianBlur(lum, (0,0), 1.0) < 48).astype(np.uint8)*255
mask = inner | (outer & dark)
# thin antennas: anything that differs from a wide median inside a fat band
band = np.zeros((H,W), np.uint8)
for a, b in lines:
    pa, pb = P([a])[0], P([b])[0]
    cv2.line(band, tuple(int(v) for v in pa), tuple(int(v) for v in pb), 255, int(26*S))
med = cv2.medianBlur(img, 41)
diff = cv2.absdiff(img, med).max(axis=2)
thin = ((diff > 22).astype(np.uint8)*255) & band
mask = mask | thin
mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k(2))
# keep the connected piece that holds the body
n, lab, stats, _ = cv2.connectedComponentsWithStats(mask)
keep = np.zeros_like(mask)
for i in range(1, n):
    if stats[i, cv2.CC_STAT_AREA] > 400: keep[lab == i] = 255
mask = keep
alpha = cv2.GaussianBlur(mask, (0,0), 0.8)
# clean plate
hole = cv2.dilate(mask, k(int(14*S)+4))
small = cv2.resize(img, None, fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA)
hs = cv2.resize(hole, (small.shape[1], small.shape[0]), interpolation=cv2.INTER_NEAREST)
fill = cv2.inpaint(small, hs, 9, cv2.INPAINT_TELEA)
fill = cv2.GaussianBlur(cv2.resize(fill, (W, H), interpolation=cv2.INTER_CUBIC), (0,0), 14)
soft = cv2.GaussianBlur(hole, (0,0), 3.0)[..., None]/255.0
plate = (img*(1-soft) + fill*soft).astype(np.uint8)
ys, xs = np.where(alpha > 4); pad = 6
x0, x1, y0, y1 = max(xs.min()-pad,0), min(xs.max()+pad,W), max(ys.min()-pad,0), min(ys.max()+pad,H)
cut = np.dstack([img, alpha])[y0:y1, x0:x1]
cv2.imwrite('lab/plate.png', plate); cv2.imwrite('lab/sat.png', cut)
print('frame', W, H, 'bbox', x0, y0, x1-x0, y1-y0)
print('pct left %.4f top %.4f width %.4f height %.4f' % (x0/W*100, y0/H*100, (x1-x0)/W*100, (y1-y0)/H*100))
# debug views
mag = np.full_like(img, (255,0,255)); a = alpha[...,None]/255.0
dbg = (img*a + mag*(1-a)).astype(np.uint8)[y0:y1, x0:x1]
cv2.imwrite('lab/dbg-cut.jpg', dbg)
cv2.imwrite('lab/dbg-plate.jpg', plate[y0-60:y1+60, x0-60:x1+60])
