#!/usr/bin/env python3
# ============================================================
#  Revora — Baca UID Kartu RFID (untuk registrasi)
# ============================================================
#
#  Jalankan script ini saat user ingin mendaftarkan kartu barunya.
#  Tempelkan kartu ke reader, UID akan tercetak di layar — user
#  lalu memasukkan UID tersebut ke halaman Profil di aplikasi web
#  (menu "Kartu RFID Bank Sampah" → Tautkan Kartu).
#
#  Jalankan: python3 read_card_uid.py
#  Tekan Ctrl+C untuk keluar.
# ============================================================

from mfrc522 import SimpleMFRC522
import RPi.GPIO as GPIO

reader = SimpleMFRC522()

print("=" * 50)
print("  Revora — Pembaca UID Kartu RFID")
print("=" * 50)
print("Tempelkan kartu ke reader...")
print("(Tekan Ctrl+C untuk keluar)\n")

try:
    while True:
        id_kartu, _ = reader.read()
        print(f"✅ UID Kartu: {id_kartu}")
        print("   Masukkan angka di atas ke aplikasi Revora")
        print("   (menu Profil → Kartu RFID Bank Sampah)\n")
        print("Tempelkan kartu berikutnya, atau Ctrl+C untuk keluar...")
except KeyboardInterrupt:
    print("\nSelesai.")
finally:
    GPIO.cleanup()
