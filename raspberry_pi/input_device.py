#!/usr/bin/env python3
# ============================================================
#  Revora Bottle Save — Raspberry Pi Input Device
# ============================================================
#
#  ALUR:
#  1. Idle — menunggu tap RFID
#  2. User tap kartu → API "identify_card" → dapat profil user
#  3. Sesi terbuka (SESSION_TIMEOUT_SEC detik) — hitung botol lokal
#  4. Sesi berakhir (timeout / tap ulang) → kirim total sekaligus
#     via API "input_botol"
#
#  DUA MODE KONEKSI (pilih salah satu):
#
#  MODE A — via Vercel proxy (DEFAULT, disarankan):
#    - device_id + secret DEVICE dikirim (untuk validasi per-device di GAS)
#    - SHARED SECRET APP diinject otomatis oleh proxy Vercel, TIDAK
#      di-hardcode di device — kalau device dicuri, secret app tetap aman
#    - Set: API_URL = 'https://revora-api.vercel.app/api/rpc'
#
#  MODE B — langsung ke Google Apps Script (jika Vercel down, dsb):
#    - Wajib set APP_SECRET juga di device — RISIKO: kalau device dicuri
#      dan flash dibaca, secret app bocor
#    - Set: API_URL = 'https://script.google.com/macros/s/xxxxx/exec'
#    - Uncomment baris APP_SECRET di bawah
#
#  INSTALASI:
#    sudo apt install python3-pip python3-rpi.gpio -y
#    pip3 install requests mfrc522 spidev --break-system-packages
#    sudo raspi-config → Interface Options → SPI → Enable
# ============================================================

import time
import requests
import RPi.GPIO as GPIO
from mfrc522 import SimpleMFRC522

# ============================================================
#  KONFIGURASI
# ============================================================

# --- Mode A (default) — via proxy Vercel ---
API_URL = "https://revora-api.vercel.app/api/rpc"

# --- Mode B — langsung ke Apps Script (jika perlu, uncomment 2 baris ini) ---
# API_URL     = "https://script.google.com/macros/s/XXXXX/exec"
# APP_SECRET  = "GANTI_DENGAN_APP_SHARED_SECRET_DARI_CODE_GS"

DEVICE_ID     = "BIN-001"    # HARUS sama dengan DeviceID di sheet Devices
DEVICE_SECRET = "GANTI_DENGAN_SECRET_DARI_SHEET_DEVICES"

SESSION_TIMEOUT_SEC = 30
JARAK_THRESHOLD_CM  = 15.0
DEBOUNCE_SEC        = 1.5

# ============================================================
#  PIN GPIO (BCM)
# ============================================================
PIN_TRIG    = 23
PIN_ECHO    = 24
PIN_LED_OK  = 17
PIN_LED_ERR = 27
PIN_BUZZER  = 22

# ============================================================
#  SETUP GPIO & RFID
# ============================================================
GPIO.setmode(GPIO.BCM)
GPIO.setwarnings(False)
GPIO.setup(PIN_TRIG, GPIO.OUT)
GPIO.setup(PIN_ECHO, GPIO.IN)
GPIO.setup(PIN_LED_OK, GPIO.OUT)
GPIO.setup(PIN_LED_ERR, GPIO.OUT)
GPIO.setup(PIN_BUZZER, GPIO.OUT)
GPIO.output(PIN_TRIG, False)

reader = SimpleMFRC522()

# ============================================================
#  STATE SESI
# ============================================================
session_user_id   = None
session_email     = None
session_nama      = None
session_count     = 0
session_last_seen = 0


def beep(times=1, dur=0.08):
    for _ in range(times):
        GPIO.output(PIN_BUZZER, True); time.sleep(dur)
        GPIO.output(PIN_BUZZER, False); time.sleep(dur)


def led_ok(on):
    GPIO.output(PIN_LED_OK, on)


def led_err_blink(times=3):
    for _ in range(times):
        GPIO.output(PIN_LED_ERR, True); time.sleep(0.15)
        GPIO.output(PIN_LED_ERR, False); time.sleep(0.15)


def baca_jarak():
    GPIO.output(PIN_TRIG, True); time.sleep(0.00001)
    GPIO.output(PIN_TRIG, False)
    timeout = time.time() + 0.03
    while GPIO.input(PIN_ECHO) == 0:
        start = time.time()
        if start > timeout: return 999.0
    while GPIO.input(PIN_ECHO) == 1:
        stop = time.time()
        if stop > timeout: return 999.0
    return ((stop - start) * 34300) / 2


def call_api(payload, timeout=10):
    """POST ke API (via proxy Vercel atau langsung GAS)."""
    body = dict(payload)
    body["device_id"] = DEVICE_ID
    body["secret"]    = DEVICE_SECRET
    # Untuk Mode B (langsung ke GAS), inject APP_SECRET:
    if "script.google.com" in API_URL:
        try:
            body["_secret"] = APP_SECRET
        except NameError:
            print("[API] ERROR: APP_SECRET belum di-set (mode langsung GAS)")
            return {"ok": False, "msg": "APP_SECRET missing"}
    try:
        resp = requests.post(API_URL, json=body, timeout=timeout)
        return resp.json()
    except Exception as e:
        print(f"[API] Error: {e}")
        return {"ok": False, "msg": str(e)}


def identify_card(card_uid):
    print(f"[RFID] Kartu terdeteksi: {card_uid}")
    res = call_api({"action": "identify_card", "card_uid": card_uid})
    if res.get("ok"):
        p = res["profile"]
        print(f"[RFID] Dikenali: {p['nama']} ({p.get('email','?')})")
    else:
        print(f"[RFID] Gagal: {res.get('msg')}")
    return res


def submit_botol(email, user_id, jumlah):
    print(f"[SUBMIT] Mengirim {jumlah} botol untuk {email or user_id}...")
    payload = {"action": "input_botol", "jumlah": jumlah}
    if email:   payload["email"]   = email
    if user_id: payload["user_id"] = user_id
    res = call_api(payload)
    if res.get("ok"):
        print(f"[SUBMIT] Berhasil. Total poin: {res.get('total_poin')}")
    else:
        print(f"[SUBMIT] Gagal: {res.get('msg')}")
    return res


def mulai_sesi(user_id, email, nama):
    global session_user_id, session_email, session_nama, session_count, session_last_seen
    session_user_id   = user_id
    session_email     = email
    session_nama      = nama
    session_count     = 0
    session_last_seen = time.time()
    led_ok(True); beep(2)
    print(f"[SESI] Dibuka untuk {nama} ({email}). Masukkan botol...")


def tutup_sesi():
    global session_user_id, session_email, session_nama, session_count
    if session_user_id and session_count > 0:
        submit_botol(session_email, session_user_id, session_count)
        beep(3, 0.15)
    elif session_user_id:
        print(f"[SESI] Ditutup tanpa botol untuk {session_nama}")
    led_ok(False)
    session_user_id = None; session_email = None; session_nama = None; session_count = 0


def loop_utama():
    global session_count, session_last_seen
    print("=" * 50)
    print(f"Revora Device Ready — {DEVICE_ID}")
    print(f"API endpoint: {API_URL}")
    print("Menunggu tap kartu RFID...")
    print("=" * 50)

    last_bottle_time = 0

    while True:
        try:
            id_kartu, _ = reader.read_no_block()

            if id_kartu is not None:
                card_uid = str(id_kartu)
                if session_user_id is None:
                    res = identify_card(card_uid)
                    if res.get("ok"):
                        p = res["profile"]
                        mulai_sesi(p["user_id"], p.get("email", ""), p["nama"])
                    else:
                        led_err_blink(); beep(1, 0.4)
                    time.sleep(1.5)
                else:
                    print("[RFID] Tap ulang — menutup sesi lebih awal")
                    tutup_sesi()
                    time.sleep(1.5)

            if session_user_id is not None:
                jarak = baca_jarak()
                now = time.time()
                if jarak < JARAK_THRESHOLD_CM and (now - last_bottle_time) > DEBOUNCE_SEC:
                    session_count += 1
                    session_last_seen = now
                    last_bottle_time = now
                    beep(1)
                    print(f"[SENSOR] Botol #{session_count} untuk {session_nama}")
                if (now - session_last_seen) > SESSION_TIMEOUT_SEC:
                    print("[SESI] Timeout — menutup sesi otomatis")
                    tutup_sesi()

            time.sleep(0.15)

        except KeyboardInterrupt:
            print("\n[EXIT] Dihentikan oleh user")
            break
        except Exception as e:
            print(f"[ERROR] {e}")
            time.sleep(1)


if __name__ == "__main__":
    try:
        loop_utama()
    finally:
        GPIO.cleanup()
        print("[EXIT] GPIO cleanup selesai")
