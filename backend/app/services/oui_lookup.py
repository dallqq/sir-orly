"""Offline-First IEEE OUI MAC Vendor Resolution Service."""
import re

# Embedded IEEE OUI Vendor prefix dictionary (100% offline-ready)
EMBEDDED_OUI_MAP: dict[str, str] = {
    "00:00:0C": "Cisco Systems",
    "00:1A:2B": "Cisco Systems",
    "00:1B:63": "Apple, Inc.",
    "00:25:00": "Apple, Inc.",
    "3C:22:FB": "Apple, Inc.",
    "F0:18:98": "Apple, Inc.",
    "BC:D0:74": "Apple, Inc.",
    "A4:83:E7": "Apple, Inc.",
    "00:1A:A0": "Dell Inc.",
    "F8:BC:12": "Dell Inc.",
    "18:03:73": "Dell Inc.",
    "3C:D9:2B": "Hewlett Packard",
    "00:1E:0B": "Hewlett Packard Enterprise",
    "FC:15:B4": "Hewlett Packard",
    "00:1B:21": "Intel Corporate",
    "00:1E:67": "Intel Corporate",
    "34:13:E8": "Intel Corporate",
    "8C:8D:28": "Intel Corporate",
    "A4:34:D9": "Intel Corporate",
    "DC:FB:48": "Intel Corporate",
    "00:E0:4C": "Realtek Semiconductor",
    "52:54:00": "QEMU / KVM Virtual NIC",
    "00:50:56": "VMware, Inc.",
    "00:0C:29": "VMware, Inc.",
    "08:00:27": "Oracle VirtualBox",
    "00:15:5D": "Microsoft Hyper-V",
    "14:CC:20": "TP-Link Technologies",
    "50:C7:BF": "TP-Link Technologies",
    "C0:25:E9": "TP-Link Technologies",
    "F4:F2:6D": "TP-Link Technologies",
    "B0:BE:76": "TP-Link Technologies",
    "04:D9:F5": "ASUSTek Computer",
    "2C:FD:A1": "ASUSTek Computer",
    "AC:9E:17": "ASUSTek Computer",
    "18:E8:29": "Ubiquiti Networks",
    "24:5A:4C": "Ubiquiti Networks",
    "78:8A:20": "Ubiquiti Networks",
    "B8:27:EB": "Raspberry Pi Foundation",
    "DC:A6:32": "Raspberry Pi Trading",
    "E4:5F:01": "Raspberry Pi Trading",
    "24:0A:C4": "Espressif Inc. (IoT)",
    "30:AE:A4": "Espressif Inc. (IoT)",
    "CC:50:E3": "Espressif Inc. (IoT)",
    "28:6C:07": "Xiaomi Communications",
    "64:09:80": "Xiaomi Communications",
    "00:16:32": "Samsung Electronics",
    "78:BD:BC": "Samsung Electronics",
    "BC:14:85": "Samsung Electronics",
    "00:E0:FC": "Huawei Technologies",
    "48:46:FB": "Huawei Technologies",
    "C8:3A:35": "Tenda Technology",
    "00:14:BF": "Linksys / Cisco",
    "A0:63:91": "Netgear",
    "C4:04:15": "Netgear",
    "1C:7E:E5": "D-Link International",
    "D8:FE:E3": "D-Link International",
}


def normalize_mac(mac: str | None) -> str:
    """Normalize MAC address to uppercase colon-separated format (XX:XX:XX:XX:XX:XX)."""
    if not mac:
        return "00:00:00:00:00:00"
    cleaned = re.sub(r"[^0-9A-Fa-f]", "", mac).upper()
    if len(cleaned) != 12:
        return "00:00:00:00:00:00"
    return ":".join(cleaned[i : i + 2] for i in range(0, 12, 2))


def lookup_mac_vendor(mac: str | None) -> str:
    """Resolve hardware vendor from MAC address 100% offline with randomized MAC detection."""
    norm = normalize_mac(mac)
    if norm in ("00:00:00:00:00:00", "FF:FF:FF:FF:FF:FF"):
        return "Local / Software Interface"
    if norm == "00:00:00:00:00:01":
        return "Loopback Interface"

    prefix = norm[:8]
    if prefix in EMBEDDED_OUI_MAP:
        return EMBEDDED_OUI_MAP[prefix]

    # Check if second hexadecimal digit indicates Locally Administered Address (Randomized MAC)
    second_char = norm[1]
    if second_char in ("2", "6", "A", "E"):
        return "Randomized / Private MAC (Mobile/OS)"

    return "Standard IEEE Network Device"

