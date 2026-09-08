# Icons folder

## Sudah ada
- `logo-mark.svg` — logo mark REVORA (vector, warna Ink hitam)
- `logo-inline.svg` — versi inline untuk embed HTML (currentColor)

## Yang perlu kamu buat sendiri (untuk install prompt PWA)
- `icon-192.png` (192×192 px)
- `icon-512.png` (512×512 px)
- `icon-maskable-512.png` (512×512 px, safe zone 80%)

## Cara paling cepat:
1. Buka https://www.pwabuilder.com/imageGenerator
2. Upload file **`logo-mark.svg`** dari folder ini
3. Set:
   - **Padding**: 10-15% (untuk logo mark, supaya tidak terlalu mepet ke tepi)
   - **Background color**: `#F5F5F0` (bone) atau `#FFFFFF`
4. Download bundle, ekstrak file yang diperlukan ke folder ini

Sebelum PNG icon ada, PWA tetap installable tapi install prompt menampilkan icon SVG (kurang optimal di beberapa browser).
