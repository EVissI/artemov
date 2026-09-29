# Генератор грязных бесшовных текстур мира «Туман» (референс - кафель и штукатурка госпиталя SH).
# Запуск: python scripts/textures.py  ->  src/tex/tiles.webp, src/tex/grime.webp, src/tex/plaster.webp
# Все шумы периодические (фильтр в частотной области на торе), поэтому текстуры стыкуются без шва.
# Чтобы не было видно повтора, стена собрана из двух слоёв с разным периодом:
#   tiles.webp  1120x1120 - 10x10 плиток по 112px (TILE в aa.jsx): тон каждой плитки, фаска, швы, грязь в швах;
#   grime.webp   832x736  - прозрачный слой грязи (разводы, ржавчина, потёки, крап), период не кратен плитке -
#                           вместе слои повторяются очень редко.
#   plaster.webp 512x512  - грязная штукатурка за кафелем (выбитые дыры, рваный край).
import numpy as np
from PIL import Image

rng = np.random.default_rng(11)
# общая яркость стены: владелец попросил фон темнее, чтобы не выделялся (1.0 - исходная)
DARK = 0.46

def noise(h, w, beta, aniso=(1.0, 1.0)):
    """Периодический фрактальный шум h x w, спектр 1/f^beta; aniso растягивает (ky, kx): ky > 1 - вытянут по вертикали."""
    n = rng.standard_normal((h, w))
    fy = np.fft.fftfreq(h)[:, None] * aniso[0]
    fx = np.fft.fftfreq(w)[None, :] * aniso[1]
    f = np.sqrt(fx * fx + fy * fy); f[0, 0] = 1
    out = np.real(np.fft.ifft2(np.fft.fft2(n) / f ** beta))
    out -= out.mean(); out /= (out.std() + 1e-9)
    return out

def smooth(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)

def mix(img, color, alpha):
    a = alpha[..., None]
    return img * (1 - a) + np.array(color, float) * a

def save_rgb(img, path):
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(path, 'WEBP', quality=80, method=6)

# ---------------- плитка: 10x10, без крупной грязи ----------------
T, N = 112, 1120
yy, xx = np.mgrid[0:N, 0:N]
img = np.zeros((N, N, 3))
base = np.array([184, 174, 155], float)
for cy in range(N // T):
    for cx in range(N // T):
        k = rng.normal(0, 0.045)
        dark = rng.random() < 0.16
        img[cy * T:(cy + 1) * T, cx * T:(cx + 1) * T] = base * (1 + k) * (0.9 if dark else 1.0)
img += (noise(N, N, 1.5) * 6)[..., None] + (noise(N, N, 0.4) * 5)[..., None]
lx, ly = xx % T, yy % T
img += (np.where(lx < 4, 6, 0) + np.where(ly < 4, 6, 0))[..., None]
img -= (np.where(lx > T - 5, 8, 0) + np.where(ly > T - 5, 8, 0))[..., None]
dist = np.minimum(np.minimum(lx, T - 1 - lx), np.minimum(ly, T - 1 - ly)).astype(float)
img = mix(img, (84, 71, 57), (np.exp(-dist / 6) * 0.5) * (0.45 + 0.55 * smooth(noise(N, N, 0.9), -1, 1)))
grout = (lx < 2) | (lx > T - 3) | (ly < 2) | (ly > T - 3)
img = mix(img, (52, 44, 37), grout * 0.92)
save_rgb(img * 0.95 * DARK, 'src/tex/tiles.webp')

# ---------------- грязь: прозрачный слой 832x736 ----------------
GH, GW = 736, 832
P = np.zeros((GH, GW, 3)); A = np.zeros((GH, GW))   # премультиплицированный цвет и альфа
def over(color, alpha):
    global P, A
    P = np.array(color, float) * alpha[..., None] + P * (1 - alpha[..., None])
    A = alpha + A * (1 - alpha)
def grunge(beta_big, a, b, fine=0.7):
    return smooth(noise(GH, GW, beta_big) + 0.55 * noise(GH, GW, fine), a, b)
over((104, 84, 62), grunge(1.5, 0.3, 1.4) * 0.55)                       # бурые разводы
over((122, 64, 44), grunge(1.6, 1.1, 2.0) * 0.55)                       # ржаво-красные пятна
streak = noise(GH, GW, 1.4, aniso=(6.0, 1.0)) + 0.4 * noise(GH, GW, 0.8)
over((70, 55, 42), smooth(streak, 1.0, 2.3) * 0.5)                      # вертикальные потёки
# тёмная грязь - мелкие пятнышки и крап, без крупных клякс (большие чёрные пятна владелец отклонил)
over((60, 50, 40), smooth(noise(GH, GW, 0.95) + 0.5 * noise(GH, GW, 0.5), 2.0, 2.9) * 0.6)
fine = noise(GH, GW, 0.35)
over((46, 38, 31), smooth(fine, 2.4, 3.2) * 0.65 * smooth(noise(GH, GW, 1.3), -0.2, 1.0))
speck = rng.random((GH, GW))
over((44, 36, 30), (speck > 0.9965) * 0.7)
rgb = np.where(A[..., None] > 1e-4, P / np.maximum(A[..., None], 1e-4), 0)
rgba = np.dstack([np.clip(rgb * DARK, 0, 255), np.clip(A * 255, 0, 255)]).astype(np.uint8)
Image.fromarray(rgba, 'RGBA').save('src/tex/grime.webp', 'WEBP', quality=68, alpha_quality=60, method=6)

# ---------------- штукатурка за кафелем ----------------
M = 512
def nM(beta, aniso=(1.0, 1.0)): return noise(M, M, beta, aniso)
def gM(beta_big, a, b, fine=0.7): return smooth(nM(beta_big) + 0.55 * nM(fine), a, b)
img = np.zeros((M, M, 3)) + np.array([132, 136, 122], float)
img += (nM(1.3) * 11)[..., None] + (nM(0.45) * 7)[..., None]
img = mix(img, (98, 88, 72), gM(1.5, 0.0, 1.2) * 0.6)
img = mix(img, (118, 62, 44), gM(1.6, 0.8, 1.8) * 0.65)
img = mix(img, (62, 48, 38), smooth(nM(1.4, aniso=(6.0, 1.0)) + 0.4 * nM(0.8), 0.6, 2.0) * 0.65)
img = mix(img, (40, 33, 28), smooth(nM(0.35), 2.2, 3.0) * 0.6)          # мелкий тёмный крап, без клякс
img = mix(img, (166, 164, 148), gM(1.7, 1.3, 2.2) * 0.35)               # отслоившиеся светлые пятна
img *= 0.55 * (0.5 + 0.5 * DARK)  # за кафелем заметно темнее: дыра должна читаться как глубина, а не как ещё одна плитка
save_rgb(img, 'src/tex/plaster.webp')
print('ok')

# ---------------- UI в духе SH2 Remake: рваный мазок краски (выделение пункта) и рваная красная линия ----------------
BH, BW = 128, 960
y = np.arange(BH)[:, None].astype(float); x = np.arange(BW)[None, :].astype(float); xn = x / BW
def n1(w, beta):
    v = noise(1, w, beta)[0]; return v / (np.abs(v).max() + 1e-9)
top = 24 + 8 * n1(BW, 1.3) + 3 * n1(BW, 0.4)
bot = BH - 24 + 8 * n1(BW, 1.3) + 3 * n1(BW, 0.4)
inside = smooth(y - top[None, :], -1.2, 1.2) * smooth(bot[None, :] - y, -1.2, 1.2)
streak = noise(BH, BW, 1.1, aniso=(1.0, 9.0))                                  # волокна кисти вдоль мазка
dry = np.clip(1.25 - np.maximum(0, xn - 0.45) * 4.2 + streak * 0.45, 0, 1)      # к концу мазок сухой и рвётся
start = smooth(x - (5 + 5 * n1(BH, 1.0)[:, None]), 0, 10)                      # неровный левый край
alpha = inside * dry * start
col = np.zeros((BH, BW, 3)) + np.array([104, 18, 20], float)
col += (streak * 16)[..., None] * np.array([1.0, 0.35, 0.3])
col = mix(col, (58, 8, 10), smooth(noise(BH, BW, 0.8, aniso=(1.0, 6.0)), 0.8, 2.0) * 0.6)
rgba = np.dstack([np.clip(col, 0, 255), np.clip(alpha * 255, 0, 255)]).astype(np.uint8)
Image.fromarray(rgba, 'RGBA').save('src/tex/brush.webp', 'WEBP', quality=82, alpha_quality=80, method=6)

LH, LW = 10, 1400
y = np.arange(LH)[:, None].astype(float); xn = np.arange(LW)[None, :] / LW
th = 1.1 + 0.9 * (n1(LW, 1.0) + 1) / 2                                        # толщина плавает
cy = LH / 2 + 1.2 * n1(LW, 1.4)
alpha = smooth(th[None, :] - np.abs(y - cy[None, :]), -0.6, 0.6)
alpha *= np.clip(1.1 + 0.5 * n1(LW, 1.6), 0.35, 1)[None, :]                   # редкие проплешины
alpha *= smooth(xn, 0, 0.08) * smooth(1 - xn, 0, 0.25)                         # концы тают
col = np.zeros((LH, LW, 3)) + np.array([150, 30, 28], float)
rgba = np.dstack([col, np.clip(alpha * 235, 0, 255)]).astype(np.uint8)
Image.fromarray(rgba, 'RGBA').save('src/tex/line.webp', 'WEBP', quality=85, alpha_quality=90, method=6)
print('ui ok')

# ---------------- туман над стеной: бесшовный по обеим осям, плывёт слоями (CSS transform) ----------------
FH, FW = 700, 1400
fog = smooth(noise(FH, FW, 1.9) + 0.35 * noise(FH, FW, 1.2), 0.0, 1.9)   # клочьями, с просветами
fog = fog * (0.55 + 0.45 * smooth(noise(FH, FW, 2.2, aniso=(1.0, 0.35)), -1.0, 1.0))   # вытянутые по горизонтали полосы
col = np.zeros((FH, FW, 3)) + np.array([208, 206, 198], float)
rgba = np.dstack([col, np.clip(fog * 190, 0, 255)]).astype(np.uint8)
Image.fromarray(rgba, 'RGBA').save('src/tex/fog.webp', 'WEBP', quality=70, alpha_quality=60, method=6)
print('fog ok')

# ---------------- дым для задника инвентаря (как в ките SH2: чёрный + фактура дыма ~7%) ----------------
SM = 1024
smoke = smooth(noise(SM, SM, 2.3) + 0.45 * noise(SM, SM, 1.5, aniso=(1.0, 0.45)), -0.3, 2.2)   # клубы, чуть вытянутые по горизонтали
smoke *= 0.6 + 0.4 * smooth(noise(SM, SM, 1.0), -1.2, 1.2)                                   # рваные края клубов
col = np.zeros((SM, SM, 3)) + np.array([190, 188, 182], float)
rgba = np.dstack([col, np.clip(smoke * 255, 0, 255)]).astype(np.uint8)
Image.fromarray(rgba, 'RGBA').save('src/tex/smoke.webp', 'WEBP', quality=70, alpha_quality=55, method=6)
print('smoke ok')

# ---------------- старая бумага для страниц журнала «Кейсов» ----------------
# Большой бесшовный лист 1536x1536 без запечённых краёв: каждая страница показывает СВОЙ кусок (сдвиг по номеру кейса и стороне
# задаёт aa.jsx), потемнение по краям страницы даёт CSS - иначе у всех страниц одни и те же пятна.
PS = 1536
img = np.zeros((PS, PS, 3)) + np.array([206, 193, 165], float)
img += (noise(PS, PS, 1.6) * 7)[..., None] + (noise(PS, PS, 0.3) * 4)[..., None]
img += (noise(PS, PS, 0.9, aniso=(1.0, 5.0)) * 3)[..., None]                                          # волокна
img = mix(img, (150, 118, 80), smooth(noise(PS, PS, 2.2) + 0.4 * noise(PS, PS, 0.8), 1.0, 2.3) * 0.5)   # крупные разводы
img = mix(img, (132, 98, 62), smooth(noise(PS, PS, 1.8) + 0.5 * noise(PS, PS, 0.7), 1.5, 2.6) * 0.45)   # пятна поменьше
img = mix(img, (120, 84, 52), (rng.random((PS, PS)) > 0.9993) * 0.6)                                  # «пятна старости»
save_rgb(img, 'src/tex/paper.webp')
print('paper ok')

# ---------------- ободранные края страниц журнала (маски) ----------------
# Альфа-маска страницы: верх, низ и внешний край рваные (многомасштабный шум + выхваченные куски + надорванные углы),
# край у корешка ровный. page-edge-l: корешок справа (левая страница), page-edge-r: она же зеркально. Одна на все страницы.
EW, EH = 600, 860
def torn_line(n, seed, base, amp):
    g = np.random.default_rng(seed)
    t = np.linspace(0, 1, n)
    v = np.zeros(n)
    for k, a in ((3, 1.0), (9, .45), (27, .22), (80, .12)):
        ph = g.random() * 6.28; v += a * np.sin(t * k * 6.28 + ph) * (0.6 + 0.4 * g.random())
    v += g.standard_normal(n).cumsum() * 0.02; v -= v.mean()
    d = base + amp * v / (np.abs(v).max() + 1e-9)
    for _ in range(g.integers(1, 3)):                                   # выхваченный кусок
        c = g.integers(n // 8, n - n // 8); w = g.integers(n // 30, n // 12); dep = amp * (1.6 + g.random() * 1.6)
        x = np.arange(n); d += dep * np.clip(1 - np.abs(x - c) / w, 0, 1) ** 1.5
    return np.maximum(d, 0)
def page_mask(seed, spine):
    yy, xx = np.mgrid[0:EH, 0:EW].astype(float)
    top = torn_line(EW, seed, 7, 6); bot = torn_line(EW, seed + 1, 7, 6)
    outer = torn_line(EH, seed + 2, 7, 6)
    ox = (EW - 1 - xx) if spine == 'left' else xx                      # расстояние до внешнего края
    inside = (yy >= top[None, :]) & (EH - 1 - yy >= bot[None, :]) & (ox >= outer[:, None])
    # надорванные уголки на внешней стороне
    g = np.random.default_rng(seed + 3)
    for cy in (0, EH - 1):
        if g.random() < 0.7:
            s = 20 + g.random() * 40
            cxv = EW - 1 if spine == 'left' else 0
            inside &= (np.abs(yy - cy) + np.abs(xx - cxv)) > s
    a = Image.fromarray((inside * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.9))
    # бахрома: у самого края - полупрозрачные волокна
    fr = np.asarray(a).astype(float) / 255
    fib = rng.random((EH, EW))
    edge = (fr > 0.05) & (fr < 0.95)
    fr = np.where(edge, fr * (0.6 + 0.4 * fib), fr)
    return Image.fromarray(np.dstack([np.full((EH, EW, 3), 255, np.uint8), (fr * 255).astype(np.uint8)]), 'RGBA')
from PIL import ImageFilter
# одна кромка на все страницы: у правых - та же, зеркально (корешок слева)
m = page_mask(100, 'right')
m.save('src/tex/page-edge-l.webp', 'WEBP', lossless=True)
m.transpose(Image.FLIP_LEFT_RIGHT).save('src/tex/page-edge-r.webp', 'WEBP', lossless=True)
print('page edges ok')

# ---------- трещины-паутина поверх имени в hero (как на обложке «Welcome to Silent Hill») ----------
# одна геометрия, два файла: hero-crack-cut.webp - толстые линии (маска вырезает их из букв),
# hero-crack-web.webp - тонкие светлые нити поверх (видны и между буквами). Сетка точек с джиттером,
# часть рёбер выброшена, рёбра ломаные - выходит «разбитое стекло», а не ровная решётка.
from PIL import ImageDraw
def crack_web(W=1800, H=640, S=2, seed=7):
    g = np.random.default_rng(seed)
    cols, rows = 10, 4
    pts = {}
    for i in range(cols + 1):
        for j in range(rows + 1):
            x = W * i / cols + (g.random() - .5) * W / cols * .8
            y = H * j / rows + (g.random() - .5) * H / rows * .8
            pts[i, j] = (x, y)
    edges = []
    for (i, j), p in pts.items():
        for di, dj, keep in ((1, 0, .62), (0, 1, .5), (1, 1, .3), (1, -1, .3)):
            q = (i + di, j + dj)
            if q in pts and g.random() < keep: edges.append((p, pts[q]))
    # несколько длинных трещин через всё имя
    for _ in range(5):
        a = (g.random() * W * .3, g.random() * H); b = (W * .7 + g.random() * W * .3, g.random() * H)
        edges.append((a, b))
    def jag(a, b):
        n = max(2, int(np.hypot(b[0] - a[0], b[1] - a[1]) / 40))
        out = []
        for k in range(n + 1):
            t = k / n; x = a[0] + (b[0] - a[0]) * t; y = a[1] + (b[1] - a[1]) * t
            if 0 < k < n: x += (g.random() - .5) * 14; y += (g.random() - .5) * 14
            out.append((x * S, y * S))
        return out
    lines = [jag(a, b) for a, b in edges]
    res = {}
    for name, wd in (('cut', 10), ('web', 2.6)):
        im = Image.new('L', (W * S, H * S), 0); d = ImageDraw.Draw(im)
        for ln in lines:
            w = wd * (0.7 + g.random() * 0.6) * S
            d.line(ln, fill=255, width=max(1, int(round(w))), joint='curve')
        im = im.resize((W, H), Image.LANCZOS)
        a = np.asarray(im)
        res[name] = Image.fromarray(np.dstack([np.full((H, W, 3), 255, np.uint8), a]), 'RGBA')
    return res
cw = crack_web()
cw['cut'].save('src/tex/hero-crack-cut.webp', 'WEBP', lossless=True)
cw['web'].save('src/tex/hero-crack-web.webp', 'WEBP', lossless=True)
print('hero cracks ok')
