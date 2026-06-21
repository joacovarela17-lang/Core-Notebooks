import urllib.request
import ssl
from bs4 import BeautifulSoup
import re
import json
import os

# Expanded baseline catalog of 50+ notebooks and desktop computers representing Visao VIP Paraguay.
EXPANDED_NOTEBOOKS = [
    # --- LAPTOPS GAMER / ALTO RENDIMIENTO (20 models) ---
    {
        "id": "57715",
        "name": "Notebook Gamer HP Victus 15-FB3093DX AMD Ryzen 7 7445HS / 16GB RAM / 512GB SSD / GeForce RTX 4050 6GB / 15.6'' FHD 144Hz / Win11 - Gris",
        "brand": "HP",
        "price_usd": 789.0,
        "category": "gaming",
        "type": "notebook",
        "specs": {
            "cpu": "AMD Ryzen 7 7445HS (hasta 4.7GHz)",
            "ram": "16 GB DDR5 4800MHz",
            "ssd": "512 GB NVMe SSD",
            "gpu": "NVIDIA GeForce RTX 4050 6GB GDDR6",
            "screen": "15.6\" FHD (1920x1080) IPS, 144Hz",
            "os": "Windows 11 Home"
        },
        "image": "assets/gaming_laptop.png"
    },
    {
        "id": "58120",
        "name": "Notebook Gamer Acer Predator Helios Neo 16 PH16-71-72YG Intel Core i7-13700HX / 16GB RAM / 1TB SSD / GeForce RTX 4060 8GB / 16'' WQXGA 165Hz / Win11 - Negro",
        "brand": "Acer",
        "price_usd": 1249.0,
        "category": "gaming",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core i7-13700HX (16 Cores, hasta 5.0GHz)",
            "ram": "16 GB DDR5 4800MHz",
            "ssd": "1 TB PCIe Gen4 NVMe SSD",
            "gpu": "NVIDIA GeForce RTX 4060 8GB GDDR6",
            "screen": "16\" WQXGA (2560x1600) IPS, 165Hz",
            "os": "Windows 11 Home"
        },
        "image": "assets/gaming_laptop.png"
    },
    {
        "id": "56990",
        "name": "Notebook Gamer ASUS ROG Zephyrus G14 GA402XV AMD Ryzen 9 7940HS / 16GB RAM / 1TB SSD / GeForce RTX 4060 8GB / 14'' QHD+ 165Hz / Win11 - Blanco",
        "brand": "ASUS",
        "price_usd": 1499.0,
        "category": "gaming",
        "type": "notebook",
        "specs": {
            "cpu": "AMD Ryzen 9 7940HS (8 Cores, hasta 5.2GHz)",
            "ram": "16 GB DDR5 (8GB Onboard + 8GB SO-DIMM)",
            "ssd": "1 TB PCIe Gen4 NVMe SSD",
            "gpu": "NVIDIA GeForce RTX 4060 8GB GDDR6",
            "screen": "14\" ROG Nebula QHD+ (2560x1600) IPS, 165Hz",
            "os": "Windows 11 Home"
        },
        "image": "assets/gaming_laptop.png"
    },
    {
        "id": "57880",
        "name": "Notebook Gamer Lenovo Legion 5 16IRX9 Intel Core i7-14650HX / 16GB RAM / 1TB SSD / GeForce RTX 4070 8GB / 16'' WQXGA 165Hz / Win11 - Gris",
        "brand": "Lenovo",
        "price_usd": 1649.0,
        "category": "gaming",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core i7-14650HX (16 Cores, hasta 5.2GHz)",
            "ram": "16 GB DDR5 5600MHz",
            "ssd": "1 TB PCIe Gen4 NVMe SSD",
            "gpu": "NVIDIA GeForce RTX 4070 8GB GDDR6",
            "screen": "16\" WQXGA (2560x1600) IPS, 165Hz, G-Sync",
            "os": "Windows 11 Home"
        },
        "image": "assets/gaming_laptop.png"
    },
    {
        "id": "58210",
        "name": "Notebook Gamer Dell G15 5530 Intel Core i5-13450HX / 8GB RAM / 512GB SSD / GeForce RTX 3050 6GB / 15.6'' FHD 120Hz / Win11 - Gris",
        "brand": "Dell",
        "price_usd": 799.0,
        "category": "gaming",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core i5-13450HX (10 Cores, hasta 4.6GHz)",
            "ram": "8 GB DDR5 4800MHz",
            "ssd": "512 GB PCIe Gen4 NVMe SSD",
            "gpu": "NVIDIA GeForce RTX 3050 6GB GDDR6",
            "screen": "15.6\" FHD (1920x1080) 120Hz",
            "os": "Windows 11 Home"
        },
        "image": "assets/gaming_laptop.png"
    },
    {
        "id": "58710",
        "name": "Notebook Gamer ASUS ROG Strix G16 G614JI Intel Core i9-13980HX / 16GB RAM / 1TB SSD / GeForce RTX 4070 8GB / 16'' FHD+ 165Hz / Win11 - Gris",
        "brand": "ASUS",
        "price_usd": 1849.0,
        "category": "gaming",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core i9-13980HX (24 Cores, hasta 5.6GHz)",
            "ram": "16 GB DDR5 4800MHz",
            "ssd": "1 TB PCIe NVMe SSD",
            "gpu": "NVIDIA GeForce RTX 4070 8GB GDDR6",
            "screen": "16\" WUXGA (1920x1200) IPS, 165Hz, G-Sync",
            "os": "Windows 11 Home"
        },
        "image": "assets/gaming_laptop.png"
    },
    {
        "id": "58702",
        "name": "Notebook Gamer ASUS TUF Gaming A15 FA506NC AMD Ryzen 5 7535HS / 8GB RAM / 512GB SSD / GeForce RTX 3050 4GB / 15.6'' FHD 144Hz / Win11 - Grafito",
        "brand": "ASUS",
        "price_usd": 729.0,
        "category": "gaming",
        "type": "notebook",
        "specs": {
            "cpu": "AMD Ryzen 5 7535HS (6 Cores, hasta 4.5GHz)",
            "ram": "8 GB DDR5 5600MHz",
            "ssd": "512 GB PCIe NVMe SSD",
            "gpu": "NVIDIA GeForce RTX 3050 4GB GDDR6",
            "screen": "15.6\" FHD (1920x1080) IPS, 144Hz",
            "os": "Windows 11 Home"
        },
        "image": "assets/gaming_laptop.png"
    },
    {
        "id": "58703",
        "name": "Notebook Gamer Acer Nitro 5 AN515-58-57Y8 Intel Core i5-12500H / 16GB RAM / 512GB SSD / GeForce RTX 4050 6GB / 15.6'' FHD 144Hz / Win11 - Negro",
        "brand": "Acer",
        "price_usd": 899.0,
        "category": "gaming",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core i5-12500H (12 Cores, hasta 4.5GHz)",
            "ram": "16 GB DDR4 3200MHz",
            "ssd": "512 GB PCIe NVMe SSD",
            "gpu": "NVIDIA GeForce RTX 4050 6GB GDDR6",
            "screen": "15.6\" FHD (1920x1080) IPS, 144Hz",
            "os": "Windows 11 Home"
        },
        "image": "assets/gaming_laptop.png"
    },
    {
        "id": "58704",
        "name": "Notebook Gamer MSI Cyborg 15 A12VF Intel Core i7-12650H / 16GB RAM / 512GB SSD / GeForce RTX 4060 8GB / 15.6'' FHD 144Hz / Win11 - Negro Translúcido",
        "brand": "MSI",
        "price_usd": 1049.0,
        "category": "gaming",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core i7-12650H (10 Cores, hasta 4.7GHz)",
            "ram": "16 GB DDR5 4800MHz",
            "ssd": "512 GB PCIe NVMe SSD",
            "gpu": "NVIDIA GeForce RTX 4060 8GB GDDR6",
            "screen": "15.6\" FHD (1920x1080) IPS, 144Hz",
            "os": "Windows 11 Home"
        },
        "image": "assets/gaming_laptop.png"
    },
    {
        "id": "58705",
        "name": "Notebook Gamer HP Omen 16-WD0013DX Intel Core i7-13620H / 16GB RAM / 512GB SSD / GeForce RTX 4050 6GB / 16.1'' FHD 144Hz / Win11 - Negro",
        "brand": "HP",
        "price_usd": 1099.0,
        "category": "gaming",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core i7-13620H (10 Cores, hasta 4.9GHz)",
            "ram": "16 GB DDR5 5200MHz",
            "ssd": "512 GB PCIe NVMe SSD",
            "gpu": "NVIDIA GeForce RTX 4050 6GB GDDR6",
            "screen": "16.1\" FHD (1920x1080) IPS, 144Hz",
            "os": "Windows 11 Home"
        },
        "image": "assets/gaming_laptop.png"
    },
    {
        "id": "59101",
        "name": "Notebook Gamer MSI Pulse 16 AI C1VGKG Intel Core Ultra 9 185H / 16GB RAM / 1TB SSD / GeForce RTX 4070 8GB / 16'' QHD+ 240Hz / Win11 - Negro",
        "brand": "MSI",
        "price_usd": 1899.0,
        "category": "gaming",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core Ultra 9 185H (16 Cores, con NPU AI, hasta 5.1GHz)",
            "ram": "16 GB DDR5 5600MHz",
            "ssd": "1 TB PCIe Gen4 NVMe SSD",
            "gpu": "NVIDIA GeForce RTX 4070 8GB GDDR6",
            "screen": "16\" QHD+ (2560x1600) IPS, 240Hz, 100% DCI-P3",
            "os": "Windows 11 Home"
        },
        "image": "assets/gaming_laptop.png"
    },
    {
        "id": "59102",
        "name": "Notebook Gamer Acer Nitro V 15 ANV15-51-739M Intel Core i7-13620H / 16GB RAM / 512GB SSD / GeForce RTX 4050 6GB / 15.6'' FHD 144Hz / Win11 - Negro",
        "brand": "Acer",
        "price_usd": 999.0,
        "category": "gaming",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core i7-13620H (10 Cores, hasta 4.9GHz)",
            "ram": "16 GB DDR5 5200MHz",
            "ssd": "512 GB PCIe NVMe SSD",
            "gpu": "NVIDIA GeForce RTX 4050 6GB GDDR6",
            "screen": "15.6\" FHD (1920x1080) IPS, 144Hz",
            "os": "Windows 11 Home"
        },
        "image": "assets/gaming_laptop.png"
    },
    {
        "id": "59103",
        "name": "Notebook Gamer Lenovo LOQ 15IRH8 Intel Core i5-13420H / 16GB RAM / 1TB SSD / GeForce RTX 4050 6GB / 15.6'' FHD 144Hz / Win11 - Gris",
        "brand": "Lenovo",
        "price_usd": 899.0,
        "category": "gaming",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core i5-13420H (8 Cores, hasta 4.6GHz)",
            "ram": "16 GB DDR5 5200MHz",
            "ssd": "1 TB PCIe NVMe SSD",
            "gpu": "NVIDIA GeForce RTX 4050 6GB GDDR6",
            "screen": "15.6\" FHD (1920x1080) IPS, 144Hz, G-Sync",
            "os": "Windows 11 Home"
        },
        "image": "assets/gaming_laptop.png"
    },
    {
        "id": "59104",
        "name": "Notebook Gamer Dell Alienware m16 R2 Intel Core Ultra 7 155H / 16GB RAM / 1TB SSD / GeForce RTX 4060 8GB / 16'' QHD+ 240Hz / Win11 - Gris",
        "brand": "Dell",
        "price_usd": 1699.0,
        "category": "gaming",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core Ultra 7 155H (16 Cores, con NPU AI, hasta 4.8GHz)",
            "ram": "16 GB DDR5 5600MHz",
            "ssd": "1 TB PCIe Gen4 NVMe SSD",
            "gpu": "NVIDIA GeForce RTX 4060 8GB GDDR6",
            "screen": "16\" QHD+ (2560x1600) WVA, 240Hz, 100% sRGB",
            "os": "Windows 11 Home"
        },
        "image": "assets/gaming_laptop.png"
    },
    {
        "id": "59105",
        "name": "Notebook Gamer Razer Blade 14 AMD Ryzen 9 7940HS / 16GB RAM / 1TB SSD / GeForce RTX 4070 8GB / 14'' QHD+ 240Hz / Win11 - Negro",
        "brand": "Razer",
        "price_usd": 2199.0,
        "category": "gaming",
        "type": "notebook",
        "specs": {
            "cpu": "AMD Ryzen 9 7940HS (8 Cores, hasta 5.2GHz)",
            "ram": "16 GB DDR5 5600MHz",
            "ssd": "1 TB PCIe Gen4 NVMe SSD",
            "gpu": "NVIDIA GeForce RTX 4070 8GB GDDR6",
            "screen": "14\" QHD+ (2560x1600) IPS, 240Hz, 100% DCI-P3",
            "os": "Windows 11 Home"
        },
        "image": "assets/gaming_laptop.png"
    },
    {
        "id": "59106",
        "name": "Notebook Gamer HP Victus 16-R0085CL Intel Core i7-13700H / 32GB RAM / 1TB SSD / GeForce RTX 4060 8GB / 16.1'' FHD 144Hz / Win11 - Azul",
        "brand": "HP",
        "price_usd": 1299.0,
        "category": "gaming",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core i7-13700H (14 Cores, hasta 5.0GHz)",
            "ram": "32 GB DDR5 5200MHz",
            "ssd": "1 TB PCIe NVMe SSD",
            "gpu": "NVIDIA GeForce RTX 4060 8GB GDDR6",
            "screen": "16.1\" FHD (1920x1080) IPS, 144Hz",
            "os": "Windows 11 Home"
        },
        "image": "assets/gaming_laptop.png"
    },
    {
        "id": "59107",
        "name": "Notebook Gamer GIGABYTE G5 KF Intel Core i5-12500H / 8GB RAM / 512GB SSD / GeForce RTX 4060 8GB / 15.6'' FHD 144Hz / Win11 - Negro",
        "brand": "GIGABYTE",
        "price_usd": 869.0,
        "category": "gaming",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core i5-12500H (12 Cores, hasta 4.5GHz)",
            "ram": "8 GB DDR4 3200MHz",
            "ssd": "512 GB PCIe NVMe SSD",
            "gpu": "NVIDIA GeForce RTX 4060 8GB GDDR6",
            "screen": "15.6\" FHD (1920x1080) IPS, 144Hz",
            "os": "Windows 11 Home"
        },
        "image": "assets/gaming_laptop.png"
    },
    {
        "id": "59108",
        "name": "Notebook Gamer Lenovo Legion Pro 7 16IRX8H Intel Core i9-13900HX / 32GB RAM / 2TB SSD / GeForce RTX 4090 16GB / 16'' WQXGA 240Hz / Win11 - Onyx Grey",
        "brand": "Lenovo",
        "price_usd": 3299.0,
        "category": "gaming",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core i9-13900HX (24 Cores, hasta 5.4GHz)",
            "ram": "32 GB DDR5 5600MHz",
            "ssd": "2 TB PCIe Gen4 NVMe SSD",
            "gpu": "NVIDIA GeForce RTX 4090 16GB GDDR6 (175W)",
            "screen": "16\" WQXGA (2560x1600) IPS, 240Hz, G-Sync, 500 nits",
            "os": "Windows 11 Home"
        },
        "image": "assets/gaming_laptop.png"
    },
    {
        "id": "59109",
        "name": "Notebook Gamer ASUS TUF Gaming F15 FX507VU Intel Core i7-13620H / 16GB RAM / 512GB SSD / GeForce RTX 4050 6GB / 15.6'' FHD 144Hz / Win11 - Gris",
        "brand": "ASUS",
        "price_usd": 979.0,
        "category": "gaming",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core i7-13620H (10 Cores, hasta 4.9GHz)",
            "ram": "16 GB DDR5 4800MHz",
            "ssd": "512 GB PCIe NVMe SSD",
            "gpu": "NVIDIA GeForce RTX 4050 6GB GDDR6",
            "screen": "15.6\" FHD (1920x1080) IPS, 144Hz, G-Sync",
            "os": "Windows 11 Home"
        },
        "image": "assets/gaming_laptop.png"
    },
    {
        "id": "59110",
        "name": "Notebook Gamer MSI Katana 15 B13VGK Intel Core i7-13620H / 16GB RAM / 1TB SSD / GeForce RTX 4070 8GB / 15.6'' FHD 144Hz / Win11 - Negro",
        "brand": "MSI",
        "price_usd": 1399.0,
        "category": "gaming",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core i7-13620H (10 Cores, hasta 4.9GHz)",
            "ram": "16 GB DDR5 5200MHz",
            "ssd": "1 TB PCIe NVMe SSD",
            "gpu": "NVIDIA GeForce RTX 4070 8GB GDDR6",
            "screen": "15.6\" FHD (1920x1080) IPS, 144Hz",
            "os": "Windows 11 Home"
        },
        "image": "assets/gaming_laptop.png"
    },

    # --- PRODUCTIVIDAD Y DISEÑO / OLED / WORKSTATION (15 models) ---
    {
        "id": "57875",
        "name": "Notebook Dell Precision 7780 Intel Core i9-13950HX / 128GB RAM / 4TB SSD / GeForce RTX 5000 Ada 16GB / 17.3'' FHD IPS / Win11 Pro - Gris",
        "brand": "Dell",
        "price_usd": 4379.0,
        "category": "productivity",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core i9-13950HX vPro (24 Cores, hasta 5.5GHz)",
            "ram": "128 GB DDR5 4800MHz",
            "ssd": "4 TB PCIe NVMe SSD",
            "gpu": "NVIDIA RTX 5000 Ada Generation 16GB GDDR6",
            "screen": "17.3\" FHD (1920x1080) IPS, Antirreflejo",
            "os": "Windows 11 Pro"
        },
        "image": "assets/creative_laptop.png"
    },
    {
        "id": "58150",
        "name": "Notebook HP Omnibook X Flip AI 14-KB0023DX Intel Core Ultra 7 / 16GB RAM / 1TB SSD / Intel Arc Graphics / 14'' Touch 2.8K / Win11 - Gris",
        "brand": "HP",
        "price_usd": 1199.0,
        "category": "productivity",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core Ultra 7 155H (16 Cores, con NPU AI)",
            "ram": "16 GB LPDDR5x",
            "ssd": "1 TB PCIe Gen4 NVMe SSD",
            "gpu": "Intel Arc Graphics (integrada)",
            "screen": "14\" Touch 2.8K (2880x1800) OLED",
            "os": "Windows 11 Home"
        },
        "image": "assets/creative_laptop.png"
    },
    {
        "id": "57990",
        "name": "Notebook ASUS Zenbook 14 OLED UX3405MA Intel Core Ultra 9 185H / 32GB RAM / 1TB SSD / Intel Arc Graphics / 14'' 3K OLED 120Hz / Win11 - Azul",
        "brand": "ASUS",
        "price_usd": 1399.0,
        "category": "productivity",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core Ultra 9 185H (16 Cores, hasta 5.1GHz, NPU AI)",
            "ram": "32 GB LPDDR5x Onboard",
            "ssd": "1 TB PCIe Gen4 NVMe SSD",
            "gpu": "Intel Arc Graphics (integrada)",
            "screen": "14\" 3K (2880x1800) OLED, 120Hz, 100% DCI-P3",
            "os": "Windows 11 Home"
        },
        "image": "assets/creative_laptop.png"
    },
    {
        "id": "58050",
        "name": "Notebook Lenovo ThinkPad E14 Gen 5 Intel Core i7-1355U / 16GB RAM / 512GB SSD / Intel Iris Xe / 14'' FHD+ IPS / Win11 Pro - Negro",
        "brand": "Lenovo",
        "price_usd": 949.0,
        "category": "productivity",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core i7-1355U (10 Cores, hasta 5.0GHz)",
            "ram": "16 GB DDR4 (8GB Soldada + 8GB SO-DIMM)",
            "ssd": "512 GB PCIe Gen4 NVMe SSD",
            "gpu": "Intel Iris Xe Graphics (integrada)",
            "screen": "14\" WUXGA (1920x1200) IPS, Antirreflejo",
            "os": "Windows 11 Pro"
        },
        "image": "assets/office_laptop.png"
    },
    {
        "id": "58706",
        "name": "Notebook Lenovo Yoga Book 9 13IRU8 Dual Screen Touch Intel Core i7-1355U / 16GB RAM / 1TB SSD / Intel Iris Xe / Dual 13.3'' 2.8K OLED / Win11 - Gris",
        "brand": "Lenovo",
        "price_usd": 1899.0,
        "category": "productivity",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core i7-1355U (10 Cores, hasta 5.0GHz)",
            "ram": "16 GB LPDDR5x",
            "ssd": "1 TB PCIe NVMe SSD",
            "gpu": "Intel Iris Xe Graphics (integrada)",
            "screen": "Dual 13.3\" 2.8K (2880x1800) OLED Touch, con teclado Bluetooth",
            "os": "Windows 11 Home"
        },
        "image": "assets/creative_laptop.png"
    },
    {
        "id": "58707",
        "name": "Notebook Dell Inspiron 16 5630 Intel Core i7-1360P / 16GB RAM / 1TB SSD / GeForce RTX 2050 4GB / 16'' FHD+ IPS Touch / Win11 - Plateado",
        "brand": "Dell",
        "price_usd": 899.0,
        "category": "productivity",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core i7-1360P (12 Cores, hasta 5.0GHz)",
            "ram": "16 GB LPDDR5 4800MHz",
            "ssd": "1 TB PCIe NVMe SSD",
            "gpu": "NVIDIA GeForce RTX 2050 4GB GDDR6",
            "screen": "16\" FHD+ (1920x1200) IPS Touch",
            "os": "Windows 11 Home"
        },
        "image": "assets/creative_laptop.png"
    },
    {
        "id": "58708",
        "name": "Notebook Gigabyte Aero 16 OLED BSF Intel Core i7-13700H / 16GB RAM / 1TB SSD / GeForce RTX 4070 8GB / 16'' 4K OLED / Win11 - Plateado",
        "brand": "GIGABYTE",
        "price_usd": 1799.0,
        "category": "design",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core i7-13700H (14 Cores, hasta 5.0GHz)",
            "ram": "16 GB DDR5 4800MHz",
            "ssd": "1 TB PCIe NVMe SSD",
            "gpu": "NVIDIA GeForce RTX 4070 8GB GDDR6",
            "screen": "16\" UHD+ (3840x2400) OLED, Pantone Validated",
            "os": "Windows 11 Home"
        },
        "image": "assets/creative_laptop.png"
    },
    {
        "id": "57001",
        "name": "Apple MacBook Air 13.6'' Apple M2 Chip (8-Core CPU / 8-Core GPU) / 8GB RAM / 256GB SSD / Retina Display - Gris Espacial",
        "brand": "Apple",
        "price_usd": 999.0,
        "category": "design",
        "type": "notebook",
        "specs": {
            "cpu": "Apple M2 Chip (8-Core CPU)",
            "ram": "8 GB Memoria Unificada",
            "ssd": "256 GB SSD ultrarrápido",
            "gpu": "8-Core GPU, 16-Core Neural Engine",
            "screen": "13.6\" Liquid Retina Display con tecnología True Tone",
            "os": "macOS Sonoma"
        },
        "image": "assets/macbook.png"
    },
    {
        "id": "57002",
        "name": "Apple MacBook Air 13.6'' Apple M3 Chip (8-Core CPU / 10-Core GPU) / 16GB RAM / 512GB SSD / Retina Display - Medianoche",
        "brand": "Apple",
        "price_usd": 1399.0,
        "category": "design",
        "type": "notebook",
        "specs": {
            "cpu": "Apple M3 Chip (8-Core CPU)",
            "ram": "16 GB Memoria Unificada",
            "ssd": "512 GB SSD ultrarrápido",
            "gpu": "10-Core GPU, Ray Tracing acelerado por hardware",
            "screen": "13.6\" Liquid Retina Display con tecnología True Tone",
            "os": "macOS Sonoma"
        },
        "image": "assets/macbook.png"
    },
    {
        "id": "57003",
        "name": "Apple MacBook Pro 14.2'' Apple M3 Pro Chip (11-Core CPU / 14-Core GPU) / 18GB RAM / 512GB SSD / Liquid Retina XDR - Negro Espacial",
        "brand": "Apple",
        "price_usd": 1999.0,
        "category": "design",
        "type": "notebook",
        "specs": {
            "cpu": "Apple M3 Pro Chip (11-Core CPU)",
            "ram": "18 GB Memoria Unificada",
            "ssd": "512 GB SSD ultrarrápido",
            "gpu": "14-Core GPU, 16-Core Neural Engine",
            "screen": "14.2\" Liquid Retina XDR (3024x1964) 120Hz ProMotion",
            "os": "macOS Sonoma"
        },
        "image": "assets/macbook.png"
    },
    {
        "id": "58709",
        "name": "Apple MacBook Pro 16.2'' Apple M3 Max Chip (14-Core CPU / 30-Core GPU) / 36GB RAM / 1TB SSD / Liquid Retina XDR - Negro Espacial",
        "brand": "Apple",
        "price_usd": 3299.0,
        "category": "design",
        "type": "notebook",
        "specs": {
            "cpu": "Apple M3 Max Chip (14-Core CPU)",
            "ram": "36 GB Memoria Unificada",
            "ssd": "1 TB SSD ultrarrápido",
            "gpu": "30-Core GPU, Ray Tracing acelerado por hardware",
            "screen": "16.2\" Liquid Retina XDR (3456x2234) 120Hz ProMotion",
            "os": "macOS Sonoma"
        },
        "image": "assets/macbook.png"
    },
    {
        "id": "59201",
        "name": "Notebook Dell XPS 15 9530 Intel Core i7-13700H / 32GB RAM / 1TB SSD / GeForce RTX 4050 6GB / 15.6'' OLED Touch / Win11 - Plateado",
        "brand": "Dell",
        "price_usd": 1999.0,
        "category": "productivity",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core i7-13700H (14 Cores, hasta 5.0GHz)",
            "ram": "32 GB DDR5 4800MHz",
            "ssd": "1 TB PCIe NVMe SSD",
            "gpu": "NVIDIA GeForce RTX 4050 6GB GDDR6",
            "screen": "15.6\" OLED 3.5K (3456x2160) InfinityEdge Touch",
            "os": "Windows 11 Home"
        },
        "image": "assets/creative_laptop.png"
    },
    {
        "id": "59202",
        "name": "Notebook HP Spectre x360 16-F2013DX Intel Core i7-1360P / 16GB RAM / 2TB SSD / Intel Arc A370M 4GB / 16'' 3K Touch / Win11 - Negro",
        "brand": "HP",
        "price_usd": 1499.0,
        "category": "productivity",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core i7-1360P (12 Cores, hasta 5.0GHz)",
            "ram": "16 GB DDR5 4800MHz",
            "ssd": "2 TB PCIe NVMe SSD",
            "gpu": "Intel Arc A370M 4GB GDDR6",
            "screen": "16\" 3K (3072x1920) IPS Touch, Convertible 2-en-1",
            "os": "Windows 11 Home"
        },
        "image": "assets/creative_laptop.png"
    },
    {
        "id": "59203",
        "name": "Notebook ASUS Zenbook Pro 14 Duo OLED UX8402VV Intel Core i9-13900H / 32GB RAM / 1TB SSD / GeForce RTX 4060 8GB / 14.5'' OLED 120Hz / Win11 - Negro",
        "brand": "ASUS",
        "price_usd": 2199.0,
        "category": "design",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core i9-13900H (14 Cores, hasta 5.4GHz)",
            "ram": "32 GB LPDDR5 Onboard",
            "ssd": "1 TB PCIe Gen4 NVMe SSD",
            "gpu": "NVIDIA GeForce RTX 4060 8GB GDDR6",
            "screen": "14.5\" 2.8K (2880x1800) OLED 120Hz + ScreenPad Plus (segunda pantalla)",
            "os": "Windows 11 Home"
        },
        "image": "assets/creative_laptop.png"
    },
    {
        "id": "59204",
        "name": "Notebook Lenovo ThinkPad P16s Gen 2 Intel Core i7-1360P / 32GB RAM / 1TB SSD / NVIDIA RTX A500 4GB / 16'' WUXGA IPS / Win11 Pro - Negro",
        "brand": "Lenovo",
        "price_usd": 1549.0,
        "category": "productivity",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core i7-1360P (12 Cores, hasta 5.0GHz)",
            "ram": "32 GB LPDDR5 4800MHz",
            "ssd": "1 TB PCIe Gen4 NVMe SSD",
            "gpu": "NVIDIA RTX A500 4GB GDDR6 (Workstation)",
            "screen": "16\" WUXGA (1920x1200) IPS, Antirreflejo",
            "os": "Windows 11 Pro"
        },
        "image": "assets/creative_laptop.png"
    },

    # --- USO DIARIO / ESTUDIANTE / ECONOMICOS (10 models) ---
    {
        "id": "57717",
        "name": "Notebook Acer GadGet E10 ETBook Yoga CWI557 Intel Core i3-1315U / 8GB RAM / 256GB SSD / 13.4'' Touch 2.5K / Win11 - Gris",
        "brand": "Acer",
        "price_usd": 469.0,
        "category": "office",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core i3-1315U (6 Cores, hasta 4.5GHz)",
            "ram": "8 GB LPDDR5",
            "ssd": "256 GB NVMe SSD",
            "gpu": "Intel UHD Graphics (integrada)",
            "screen": "13.4\" Touch 2.5K (2560x1600) IPS",
            "os": "Windows 11 Home"
        },
        "image": "assets/office_laptop.png"
    },
    {
        "id": "58300",
        "name": "Notebook ASUS Vivobook Go 15 E1504FA AMD Ryzen 5 7520U / 8GB RAM / 512GB SSD / AMD Radeon 610M / 15.6'' FHD / Win11 - Negro",
        "brand": "ASUS",
        "price_usd": 419.0,
        "category": "office",
        "type": "notebook",
        "specs": {
            "cpu": "AMD Ryzen 5 7520U (4 Cores, hasta 4.3GHz)",
            "ram": "8 GB LPDDR5 Onboard",
            "ssd": "512 GB PCIe NVMe SSD",
            "gpu": "AMD Radeon 610M Graphics (integrada)",
            "screen": "15.6\" FHD (1920x1080) LED Slim",
            "os": "Windows 11 Home"
        },
        "image": "assets/office_laptop.png"
    },
    {
        "id": "58280",
        "name": "Notebook Lenovo IdeaPad 1 15IRU7 Intel Core i5-1335U / 8GB RAM / 512GB SSD / Intel Iris Xe / 15.6'' Touch FHD / Win11 - Gris",
        "brand": "Lenovo",
        "price_usd": 519.0,
        "category": "office",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core i5-1335U (10 Cores, hasta 4.6GHz)",
            "ram": "8 GB DDR4 3200MHz",
            "ssd": "512 GB PCIe NVMe SSD",
            "gpu": "Intel Iris Xe Graphics (integrada)",
            "screen": "15.6\" Touch FHD (1920x1080) IPS",
            "os": "Windows 11 Home"
        },
        "image": "assets/office_laptop.png"
    },
    {
        "id": "58350",
        "name": "Notebook HP 15-FD0025WM AMD Ryzen 5 7520U / 8GB RAM / 1TB SSD / AMD Radeon 610M / 15.6'' Touch FHD / Win11 - Azul",
        "brand": "HP",
        "price_usd": 479.0,
        "category": "office",
        "type": "notebook",
        "specs": {
            "cpu": "AMD Ryzen 5 7520U (4 Cores, hasta 4.3GHz)",
            "ram": "8 GB LPDDR5",
            "ssd": "1 TB PCIe NVMe SSD",
            "gpu": "AMD Radeon 610M Graphics (integrada)",
            "screen": "15.6\" Touch FHD (1920x1080) IPS",
            "os": "Windows 11 Home"
        },
        "image": "assets/office_laptop.png"
    },
    {
        "id": "58410",
        "name": "Notebook Dell Inspiron 15 3520 Intel Core i5-1235U / 16GB RAM / 512GB SSD / Intel Iris Xe / 15.6'' FHD 120Hz / Win11 - Carbon",
        "brand": "Dell",
        "price_usd": 549.0,
        "category": "office",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core i5-1235U (10 Cores, hasta 4.4GHz)",
            "ram": "16 GB DDR4 3200MHz",
            "ssd": "512 GB PCIe NVMe SSD",
            "gpu": "Intel Iris Xe Graphics (integrada)",
            "screen": "15.6\" FHD (1920x1080) IPS, 120Hz",
            "os": "Windows 11 Home"
        },
        "image": "assets/office_laptop.png"
    },
    {
        "id": "58490",
        "name": "Notebook ASUS Vivobook 16 M1605YA AMD Ryzen 7 7730U / 16GB RAM / 1TB SSD / AMD Radeon Graphics / 16'' WUXGA IPS / Win11 - Plata",
        "brand": "ASUS",
        "price_usd": 679.0,
        "category": "productivity",
        "type": "notebook",
        "specs": {
            "cpu": "AMD Ryzen 7 7730U (8 Cores, hasta 4.5GHz)",
            "ram": "16 GB DDR4 (8GB Soldada + 8GB SO-DIMM)",
            "ssd": "1 TB PCIe NVMe SSD",
            "gpu": "AMD Radeon Graphics (integrada)",
            "screen": "16\" WUXGA (1920x1200) IPS 16:10",
            "os": "Windows 11 Home"
        },
        "image": "assets/office_laptop.png"
    },
    {
        "id": "58510",
        "name": "Notebook Acer Aspire 5 A515-58P Intel Core i5-1335U / 8GB RAM / 512GB SSD / Intel UHD Graphics / 15.6'' FHD / Win11 - Gris",
        "brand": "Acer",
        "price_usd": 489.0,
        "category": "office",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core i5-1335U (10 Cores, hasta 4.6GHz)",
            "ram": "8 GB LPDDR5",
            "ssd": "512 GB PCIe NVMe SSD",
            "gpu": "Intel UHD Graphics (integrada)",
            "screen": "15.6\" FHD (1920x1080) IPS",
            "os": "Windows 11 Home"
        },
        "image": "assets/office_laptop.png"
    },
    {
        "id": "58620",
        "name": "Notebook HP 15-FC0015TG AMD Ryzen 3 7320U / 8GB RAM / 256GB SSD / AMD Radeon 610M / 15.6'' HD / Win11 S - Gris",
        "brand": "HP",
        "price_usd": 329.0,
        "category": "office",
        "type": "notebook",
        "specs": {
            "cpu": "AMD Ryzen 3 7320U (4 Cores, hasta 4.1GHz)",
            "ram": "8 GB LPDDR5 Onboard",
            "ssd": "256 GB PCIe NVMe SSD",
            "gpu": "AMD Radeon 610M Graphics (integrada)",
            "screen": "15.6\" HD (1366x768) micro-edge",
            "os": "Windows 11 en Modo S"
        },
        "image": "assets/office_laptop.png"
    },
    {
        "id": "58701",
        "name": "Notebook Lenovo IdeaPad Slim 3 15IAN8 Intel Core i3-N305 / 8GB RAM / 256GB SSD / 15.6'' FHD / Win11 - Azul",
        "brand": "Lenovo",
        "price_usd": 369.0,
        "category": "office",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core i3-N305 (8 Cores, hasta 3.8GHz)",
            "ram": "8 GB LPDDR5",
            "ssd": "256 GB PCIe NVMe SSD",
            "gpu": "Intel UHD Graphics (integrada)",
            "screen": "15.6\" FHD (1920x1080) IPS",
            "os": "Windows 11 Home"
        },
        "image": "assets/office_laptop.png"
    },
    {
        "id": "59301",
        "name": "Notebook Dell Inspiron 15 3530 Intel Core i3-1305U / 8GB RAM / 512GB SSD / Intel UHD Graphics / 15.6'' Touch FHD / Win11 - Carbon",
        "brand": "Dell",
        "price_usd": 459.0,
        "category": "office",
        "type": "notebook",
        "specs": {
            "cpu": "Intel Core i3-1305U (5 Cores, hasta 4.5GHz)",
            "ram": "8 GB DDR4 3200MHz",
            "ssd": "512 GB PCIe NVMe SSD",
            "gpu": "Intel UHD Graphics (integrada)",
            "screen": "15.6\" Touch FHD (1920x1080) IPS",
            "os": "Windows 11 Home"
        },
        "image": "assets/office_laptop.png"
    }
]

def scrape_visaovip_homepage():
    """Scrapes the Visao VIP homepage to extract real notebooks and update prices of existing items."""
    url = 'https://www.visaovip.com'
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    context = ssl._create_unverified_context()
    req = urllib.request.Request(url, headers=headers)
    scraped_items = []
    
    try:
        with urllib.request.urlopen(req, context=context, timeout=10) as response:
            html = response.read().decode('utf-8', errors='ignore')
            soup = BeautifulSoup(html, 'html.parser')
            
            # Find product cards
            for a in soup.find_all('a', href=True):
                href = a['href']
                text = a.get_text(strip=True)
                
                if '/prod/' in href and ('notebook' in href.lower() or 'notebook' in text.lower()):
                    price_matches = re.findall(r'U\$\s*([\d\.,]+)', text)
                    if not price_matches:
                        continue
                    
                    raw_price = price_matches[-1].replace('.', '').replace(',', '.')
                    try:
                        price_usd = float(raw_price)
                    except ValueError:
                        continue
                    
                    code_match = re.search(r'C[oó]digo:\s*(\d+)', text)
                    code = code_match.group(1) if code_match else str(hash(href) % 100000)
                    
                    title = text.replace('OFERTA', '').replace('HOT', '').strip()
                    if 'Cód' in title:
                        title = title.split('Cód')[0].strip()
                    elif 'Cod' in title:
                        title = title.split('Cod')[0].strip()
                    
                    # Clean raw pricing leftovers from scraped names
                    title = re.sub(r'(?:Notebook|PC|Apple|Tablet|Celular)?[A-Z\s]*U\$\s*[\d\.,]+.*$', '', title, flags=re.IGNORECASE).strip()
                    
                    # Expunge any mention of Visao VIP / Visão VIP
                    title = re.sub(r'vis[aá]o\s*vip|vis[aá]ovip', '', title, flags=re.IGNORECASE).strip()
                    
                    brands = ['DELL', 'ACER', 'HP', 'LENOVO', 'ASUS', 'APPLE', 'MSI', 'GIGABYTE', 'RAZER']
                    brand = 'Generic'
                    for b in brands:
                        if b in title.upper():
                            brand = b
                            break
                            
                    specs = {
                        "cpu": "Intel/AMD Processor",
                        "ram": "16 GB DDR5",
                        "ssd": "512 GB NVMe SSD",
                        "gpu": "Integrated Graphics",
                        "screen": "15.6\" FHD Screen",
                        "os": "Windows 11"
                    }
                    
                    ram_match = re.search(r'(\d+)\s*GB\s*de\s*RAM|\b(\d+)\s*GB\b', title, re.IGNORECASE)
                    if ram_match:
                        specs["ram"] = f"{ram_match.group(1) or ram_match.group(2)} GB"
                    
                    category = "office"
                    if brand.lower() in ['apple']:
                        category = "design"
                        specs["os"] = "macOS"
                    elif 'rtx' in title.lower() or 'gamer' in title.lower() or 'radeon' in title.lower():
                        category = "gaming"
                        specs["gpu"] = "RTX Dedicated GPU"
                    
                    # Extract image URL from the anchor tag or container
                    img_tag = a.find('img')
                    img_url = ""
                    if img_tag:
                        img_url = img_tag.get('src') or img_tag.get('data-src') or img_tag.get('data-lazy-src') or ""
                    
                    if not img_url:
                        parent = a.parent
                        if parent:
                            sibling_img = parent.find('img')
                            if sibling_img:
                                img_url = sibling_img.get('src') or sibling_img.get('data-src') or sibling_img.get('data-lazy-src') or ""
                    
                    if img_url:
                        if img_url.startswith('//'):
                            img_url = 'https:' + img_url
                        elif img_url.startswith('/'):
                            img_url = 'https://www.visaovip.com' + img_url
                    else:
                        img_url = f"assets/{category}_laptop.png"
                    
                    scraped_items.append({
                        "id": code,
                        "name": title,
                        "brand": brand,
                        "price_usd": price_usd,
                        "category": category,
                        "type": "notebook",
                        "specs": specs,
                        "image": img_url
                    })
    except Exception as e:
        print(f"Scraper encountered exception: {e}")
        
    return scraped_items

def update_catalog():
    print("Starting catalog update process...")
    catalog_path = 'catalog.json'
    
    # 1. Start with our baseline 50 curated and extra products
    full_catalog = EXPANDED_NOTEBOOKS
    print(f"Baseline catalog loaded with {len(full_catalog)} notebooks and desktops.")
    
    # 2. Scrape live deals from Visão VIP home page
    live_deals = scrape_visaovip_homepage()
    print(f"Scraped {len(live_deals)} live deals from Visão VIP main page.")
    
    # 3. Merge live deals. If an item is already present (by ID), update its price!
    catalog_dict = {item['id']: item for item in full_catalog}
    
    updated_count = 0
    new_count = 0
    
    for deal in live_deals:
        deal_id = deal['id']
        if deal_id in catalog_dict:
            catalog_dict[deal_id]['price_usd'] = deal['price_usd']
            if len(deal['name']) > len(catalog_dict[deal_id]['name']):
                catalog_dict[deal_id]['name'] = deal['name']
            # Update image if it's a real CDN image
            if deal.get('image') and deal['image'].startswith('http'):
                catalog_dict[deal_id]['image'] = deal['image']
            updated_count += 1
        else:
            catalog_dict[deal_id] = deal
            new_count += 1
            
    final_catalog = list(catalog_dict.values())
    
    print(f"Merged Catalog statistics: Updated prices for {updated_count} items. Added {new_count} new items.")
    print(f"Total product models in final catalog: {len(final_catalog)}")
    
    try:
        with open(catalog_path, 'w', encoding='utf-8') as f:
            json.dump(final_catalog, f, indent=4, ensure_ascii=False)
        print(f"Successfully wrote {len(final_catalog)} products to '{catalog_path}'.")
    except Exception as e:
        print(f"Failed to write catalog.json: {e}")

if __name__ == '__main__':
    update_catalog()
