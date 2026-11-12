// server.ts
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

// src/data/mockData.ts
var INITIAL_USERS = [
  {
    id: "usr-admin",
    username: "admin",
    name: "\u0627\u0644\u0645\u0647\u0646\u062F\u0633 \u0648\u0633\u0627\u0645 (\u0645\u062F\u064A\u0631 \u0627\u0644\u0646\u0638\u0627\u0645)",
    role: "admin",
    phone: "01000000001",
    isActive: true,
    createdAt: "2026-01-01T00:00:00Z",
    passwordHash: "123456"
  },
  {
    id: "usr-cashier",
    username: "cashier",
    name: "\u0623\u062D\u0645\u062F \u0643\u0627\u0634\u064A\u0631 (\u0646\u0642\u0637\u0629 \u0627\u0644\u0628\u064A\u0639)",
    role: "cashier",
    phone: "01122334455",
    isActive: true,
    createdAt: "2026-01-15T00:00:00Z",
    passwordHash: "123456"
  },
  {
    id: "usr-store",
    username: "storekeeper",
    name: "\u0645\u062D\u0645\u0648\u062F \u0623\u0645\u064A\u0646 \u0627\u0644\u0645\u062E\u0632\u0646 \u0648\u0627\u0644\u062A\u062C\u0645\u064A\u0639",
    role: "storekeeper",
    phone: "01233445566",
    isActive: true,
    createdAt: "2026-01-20T00:00:00Z",
    passwordHash: "123456"
  }
];
var INITIAL_SETTINGS = {
  storeName: "\u0648\u0633\u0627\u0645 \u0644\u0644\u0623\u062F\u0648\u0627\u062A \u0648\u0627\u0644\u062A\u0648\u0631\u064A\u062F\u0627\u062A \u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0626\u064A\u0629",
  ownerName: "\u0645\u0624\u0633\u0633\u0629 \u0648\u0633\u0627\u0645 \u0644\u0644\u0623\u062F\u0648\u0627\u062A \u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0626\u064A\u0629",
  phone: "01000000001",
  phoneAlt: "01200000002",
  address: "\u0627\u0644\u0642\u0627\u0647\u0631\u0629 - \u0627\u0644\u0633\u0628\u062A\u064A\u0629 - \u0634\u0627\u0631\u0639 \u0633\u0648\u0642 \u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0621",
  commercialRecord: "",
  agriculturalLicense: "\u0633\u062C\u0644 \u062A\u062C\u0627\u0631\u064A \u062A\u0648\u0631\u064A\u062F\u0627\u062A \u0643\u0647\u0631\u0628\u0627\u0626\u064A\u0629 \u0648\u0645\u0642\u0627\u0648\u0644\u0627\u062A",
  taxRate: 0,
  invoiceFooterNote: "",
  currency: "\u062C.\u0645",
  permissionsMatrix: {
    admin: [
      "dashboard",
      "pos",
      "sales",
      "sales_returns",
      "purchases",
      "purchase_returns",
      "inventory",
      "assembly",
      "customers",
      "suppliers",
      "finance",
      "statements",
      "expiry",
      "reports",
      "calculator",
      "users",
      "sqlserver",
      "settings"
    ],
    cashier: [
      "dashboard",
      "pos",
      "sales",
      "sales_returns",
      "customers",
      "finance",
      "statements",
      "reports",
      "calculator"
    ],
    storekeeper: [
      "dashboard",
      "inventory",
      "assembly",
      "purchases",
      "purchase_returns",
      "suppliers",
      "expiry",
      "reports"
    ]
  }
};
var INITIAL_SAFES = [
  {
    id: "safe-main",
    name: "\u0627\u0644\u062E\u0632\u064A\u0646\u0629 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629 (\u0627\u0644\u0645\u0643\u062A\u0628)",
    type: "cash",
    balance: 45e3,
    isDefault: true,
    notes: "\u0627\u0644\u062E\u0632\u064A\u0646\u0629 \u0627\u0644\u0645\u0631\u0643\u0632\u064A\u0629 \u0644\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0643\u0628\u0631\u0649 \u0648\u0633\u062F\u0627\u062F \u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646 \u0648\u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A"
  },
  {
    id: "safe-pos",
    name: "\u062F\u0631\u062C \u0643\u0627\u0634\u064A\u0631 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A (POS Drawer)",
    type: "pos_drawer",
    balance: 8500,
    notes: "\u0646\u0642\u062F\u064A\u0629 \u0627\u0644\u062A\u062D\u0635\u064A\u0644 \u0627\u0644\u064A\u0648\u0645\u064A \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0645\u0646 \u0645\u0628\u064A\u0639\u0627\u062A \u0627\u0644\u0645\u0639\u0631\u0636"
  },
  {
    id: "safe-bank",
    name: "\u062D\u0633\u0627\u0628 \u0628\u0646\u0643 \u0645\u0635\u0631 (\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0648\u0641\u064A\u0632\u0627)",
    type: "bank",
    balance: 12e4,
    accountNumber: "10203040506070",
    notes: "\u0627\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u0628\u0646\u0643\u064A \u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0627\u0644\u0634\u0631\u0643\u0627\u062A \u0648\u0627\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0627\u0644\u0631\u0633\u0645\u064A\u0629"
  },
  {
    id: "safe-instapay",
    name: "\u0645\u062D\u0641\u0638\u0629 \u0641\u0648\u062F\u0627\u0641\u0648\u0646 \u0643\u0627\u0634 \u0648\u0627\u0646\u0633\u062A\u0627 \u0628\u0627\u064A",
    type: "wallet",
    balance: 15400,
    accountNumber: "01000000001@instapay",
    notes: "\u0645\u0633\u062A\u062D\u0642\u0627\u062A \u0648\u0645\u062F\u0641\u0648\u0639\u0627\u062A \u0627\u0644\u062F\u0641\u0639 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0627\u0644\u0633\u0631\u064A\u0639"
  }
];
var INITIAL_PRODUCTS = [
  // 1. الأسلاك والكابلات (Wires & Cables)
  {
    id: "p-wire-15",
    name: "\u0633\u0644\u0643 \u0646\u062D\u0627\u0633 \u0645\u0639\u0632\u0648\u0644 1.5 \u0645\u0645 \u0633\u0648\u064A\u062F\u064A \u0623\u0635\u0644\u064A (\u0644\u0641\u0629 100\u0645)",
    category: "wires_cables",
    brand: "\u0627\u0644\u0633\u0648\u064A\u062F\u064A \u0625\u0644\u064A\u0643\u062A\u0631\u064A\u0643",
    voltage: "450/750V",
    unit: "\u0644\u0641\u0629",
    purchasePrice: 950,
    sellingPrice: 1150,
    wholesalePrice: 1080,
    quantity: 45,
    minAlertQuantity: 10,
    barcode: "6221001001501",
    warrantyMonths: 0,
    notes: "\u0646\u062D\u0627\u0633 \u0623\u062D\u0645\u0631 \u0646\u0642\u064A 99.9% \u0645\u0639\u062A\u0645\u062F \u0644\u0644\u0645\u0634\u0627\u0631\u064A\u0639 \u0648\u0627\u0644\u062A\u0623\u0633\u064A\u0633"
  },
  {
    id: "p-wire-25",
    name: "\u0633\u0644\u0643 \u0646\u062D\u0627\u0633 \u0645\u0639\u0632\u0648\u0644 2.5 \u0645\u0645 \u0633\u0648\u064A\u062F\u064A \u0623\u0635\u0644\u064A (\u0644\u0641\u0629 100\u0645)",
    category: "wires_cables",
    brand: "\u0627\u0644\u0633\u0648\u064A\u062F\u064A \u0625\u0644\u064A\u0643\u062A\u0631\u064A\u0643",
    voltage: "450/750V",
    unit: "\u0644\u0641\u0629",
    purchasePrice: 1500,
    sellingPrice: 1780,
    wholesalePrice: 1690,
    quantity: 38,
    minAlertQuantity: 8,
    barcode: "6221001002508",
    warrantyMonths: 0,
    notes: "\u0633\u0644\u0643 \u0628\u0631\u0627\u064A\u0632 \u0648\u062A\u063A\u0630\u064A\u0629 \u0623\u062D\u0645\u0627\u0644 \u0645\u062A\u0648\u0633\u0637\u0629 \u0648\u062A\u0643\u064A\u064A\u0641\u0627\u062A 1.5 \u062D\u0635\u0627\u0646"
  },
  {
    id: "p-wire-40",
    name: "\u0633\u0644\u0643 \u0646\u062D\u0627\u0633 \u0645\u0639\u0632\u0648\u0644 4 \u0645\u0645 \u0633\u0648\u064A\u062F\u064A \u0623\u0635\u0644\u064A (\u0644\u0641\u0629 100\u0645)",
    category: "wires_cables",
    brand: "\u0627\u0644\u0633\u0648\u064A\u062F\u064A \u0625\u0644\u064A\u0643\u062A\u0631\u064A\u0643",
    voltage: "450/750V",
    unit: "\u0644\u0641\u0629",
    purchasePrice: 2400,
    sellingPrice: 2850,
    wholesalePrice: 2700,
    quantity: 22,
    minAlertQuantity: 5,
    barcode: "6221001004007",
    warrantyMonths: 0,
    notes: "\u0633\u0644\u0643 \u0645\u0637\u0627\u0628\u062E \u0648\u0623\u062D\u0645\u0627\u0644 \u0633\u062E\u0627\u0646\u0627\u062A \u0648\u062A\u0643\u064A\u064A\u0641\u0627\u062A 2.25 \u062D\u0635\u0627\u0646"
  },
  {
    id: "p-wire-60",
    name: "\u0633\u0644\u0643 \u0646\u062D\u0627\u0633 \u0645\u0639\u0632\u0648\u0644 6 \u0645\u0645 \u0633\u0648\u064A\u062F\u064A \u0623\u0635\u0644\u064A (\u0644\u0641\u0629 100\u0645)",
    category: "wires_cables",
    brand: "\u0627\u0644\u0633\u0648\u064A\u062F\u064A \u0625\u0644\u064A\u0643\u062A\u0631\u064A\u0643",
    voltage: "450/750V",
    unit: "\u0644\u0641\u0629",
    purchasePrice: 3600,
    sellingPrice: 4200,
    wholesalePrice: 3950,
    quantity: 14,
    minAlertQuantity: 4,
    barcode: "6221001006001",
    warrantyMonths: 0,
    notes: "\u062A\u063A\u0630\u064A\u0629 \u0631\u0626\u064A\u0633\u064A\u0629 \u0644\u0644\u0648\u062D\u0627\u062A \u0648\u062A\u0643\u064A\u064A\u0641\u0627\u062A 3 \u062D\u0635\u0627\u0646 \u0648\u0623\u0641\u0631\u0627\u0646"
  },
  {
    id: "p-wire-rg6",
    name: "\u0633\u0644\u0643 \u062F\u0634 \u0646\u062D\u0627\u0633 \u0645\u0639\u0632\u0648\u0644 RG6 \u0639\u0627\u0644\u064A \u0627\u0644\u062C\u0648\u062F\u0629 (\u0645\u062A\u0631)",
    category: "wires_cables",
    brand: "\u0628\u0631\u064A\u0645\u064A\u0648\u0645 \u0643\u0627\u0628\u0644",
    voltage: "\u0625\u0634\u0627\u0631\u0629 \u062F\u064A\u062C\u064A\u062A\u0627\u0644",
    unit: "\u0645\u062A\u0631",
    purchasePrice: 8,
    sellingPrice: 14,
    wholesalePrice: 11,
    quantity: 450,
    minAlertQuantity: 100,
    barcode: "6221001009019",
    warrantyMonths: 0,
    notes: "\u0634\u064A\u0644\u062F \u0639\u0627\u0644\u064A \u0627\u0644\u0643\u062B\u0627\u0641\u0629 \u0636\u062F \u0627\u0644\u062A\u0634\u0648\u064A\u0634 HD 4K"
  },
  // 2. المفاتيح والبرايز والشاسيهات (Switches & Sockets)
  {
    id: "p-sw-venus",
    name: "\u0644\u0642\u0645\u0629 \u0645\u0641\u062A\u0627\u062D \u0625\u0646\u0627\u0631\u0629 \u0639\u0631\u064A\u0636 16 \u0623\u0645\u0628\u064A\u0631 \u0641\u064A\u0646\u0648\u0633 \u0628\u064A\u062C",
    category: "switches_sockets",
    brand: "\u0641\u064A\u0646\u0648\u0633",
    voltage: "250V",
    amperage: "16A",
    unit: "\u0642\u0637\u0639\u0629",
    purchasePrice: 22,
    sellingPrice: 32,
    wholesalePrice: 27,
    quantity: 180,
    minAlertQuantity: 30,
    barcode: "6222002001015",
    warrantyMonths: 24,
    notes: "\u0644\u0642\u0645\u0629 \u0625\u0646\u0627\u0631\u0629 \u0628\u064A\u0636\u0627\u0621 \u0645\u0639 \u0641\u0636\u0629 \u062A\u0644\u0627\u0645\u0633 \u0639\u0627\u0644\u064A\u0629 \u0627\u0644\u0646\u0642\u0627\u0621"
  },
  {
    id: "p-sock-schneider",
    name: "\u0644\u0642\u0645\u0629 \u0628\u0631\u064A\u0632\u0629 \u0645\u0641\u0631\u062F\u0629 \u0634\u0646\u0627\u064A\u062F\u0631 \u0623\u0635\u0644\u064A \u0645\u0639 \u0637\u0631\u0641 \u062A\u0623\u0631\u064A\u0636 16A",
    category: "switches_sockets",
    brand: "\u0634\u0646\u0627\u064A\u062F\u0631 \u0625\u0644\u064A\u0643\u062A\u0631\u064A\u0643",
    voltage: "250V",
    amperage: "16A",
    unit: "\u0642\u0637\u0639\u0629",
    purchasePrice: 28,
    sellingPrice: 42,
    wholesalePrice: 35,
    quantity: 140,
    minAlertQuantity: 25,
    barcode: "6222002002029",
    warrantyMonths: 36,
    notes: "\u0628\u0631\u064A\u0632\u0629 \u0623\u0645\u0627\u0646 \u0645\u0639 \u0634\u062A\u0631 \u062D\u0645\u0627\u064A\u0629 \u0644\u0644\u0623\u0637\u0641\u0627\u0644"
  },
  {
    id: "p-chassis-magic",
    name: "\u0634\u0627\u0633\u064A\u0647 \u0645\u0627\u062C\u064A\u0643 \u062D\u062F\u064A\u062F \u0645\u0642\u0648\u0649 \u0641\u064A\u0646\u0648\u0633 \u0645\u0639 \u0645\u0633\u0627\u0645\u064A\u0631 \u0627\u0644\u062A\u062B\u0628\u064A\u062A",
    category: "switches_sockets",
    brand: "\u0641\u064A\u0646\u0648\u0633",
    unit: "\u0642\u0637\u0639\u0629",
    purchasePrice: 8,
    sellingPrice: 14,
    wholesalePrice: 11,
    quantity: 260,
    minAlertQuantity: 40,
    barcode: "6222002003033",
    notes: "\u0634\u0627\u0633\u064A\u0647 \u0645\u0627\u062C\u064A\u0643 \u0642\u064A\u0627\u0633\u064A \u064A\u0631\u0643\u0628 \u0639\u0644\u0649 \u0643\u0627\u0641\u0629 \u0627\u0644\u0639\u0644\u0628 \u0627\u0644\u0645\u0627\u062C\u064A\u0643"
  },
  {
    id: "p-face-venus",
    name: "\u0648\u0634 \u0645\u0627\u062C\u064A\u0643 3 \u0641\u062A\u062D\u0629 \u0643\u0644\u0627\u0633\u064A\u0643 \u0641\u064A\u0646\u0648\u0633 \u0639\u0627\u062C\u064A",
    category: "switches_sockets",
    brand: "\u0641\u064A\u0646\u0648\u0633",
    unit: "\u0642\u0637\u0639\u0629",
    purchasePrice: 12,
    sellingPrice: 20,
    wholesalePrice: 16,
    quantity: 210,
    minAlertQuantity: 30,
    barcode: "6222002004047",
    notes: "\u0628\u0644\u0627\u0633\u062A\u064A\u0643 \u0628\u0648\u0644\u064A \u0643\u0631\u0628\u0648\u0646\u0627\u062A \u0645\u0642\u0627\u0648\u0645 \u0644\u0644\u062E\u062F\u0634 \u0648\u0627\u0644\u062D\u0631\u0627\u0631\u0629"
  },
  {
    id: "p-sw-deviateur",
    name: "\u0645\u0641\u062A\u0627\u062D \u062F\u064A\u0641\u064A\u0627\u062A\u064A\u0631 (\u0637\u0631\u0641 \u0633\u0644\u0645) 16A \u0641\u064A\u0646\u0648\u0633",
    category: "switches_sockets",
    brand: "\u0641\u064A\u0646\u0648\u0633",
    voltage: "250V",
    amperage: "16A",
    unit: "\u0642\u0637\u0639\u0629",
    purchasePrice: 26,
    sellingPrice: 38,
    wholesalePrice: 32,
    quantity: 65,
    minAlertQuantity: 15,
    barcode: "6222002005051",
    warrantyMonths: 24,
    notes: "\u0644\u0644\u062A\u062D\u0643\u0645 \u0641\u064A \u0625\u0646\u0627\u0631\u0629 \u0627\u0644\u0645\u0645\u0631\u0627\u062A \u0648\u0627\u0644\u0633\u0644\u0627\u0644\u0645 \u0645\u0646 \u0645\u0643\u0627\u0646\u064A\u0646"
  },
  // 3. اللمبات والكشافات والإنارة (Lighting & Bulbs)
  {
    id: "p-lamp-9w",
    name: "\u0644\u0645\u0628\u0629 \u0644\u064A\u062F 9 \u0648\u0627\u062A \u0625\u0636\u0627\u0621\u0629 \u0628\u064A\u0636\u0627\u0621 E27 \u062A\u0648\u0634\u064A\u0628\u0627",
    category: "lighting_bulbs",
    brand: "\u062A\u0648\u0634\u064A\u0628\u0627",
    voltage: "220V",
    powerWatt: "9W",
    unit: "\u0642\u0637\u0639\u0629",
    purchasePrice: 35,
    sellingPrice: 50,
    wholesalePrice: 42,
    quantity: 120,
    minAlertQuantity: 20,
    barcode: "6223003001012",
    warrantyMonths: 24,
    notes: "\u0625\u0636\u0627\u0621\u0629 \u0642\u0648\u064A\u0629 850 \u0644\u0648\u0645\u0646 \u0645\u0639 \u0636\u0645\u0627\u0646 \u0645\u0639\u062A\u0645\u062F \u0644\u0645\u062F\u0629 \u0639\u0627\u0645\u064A\u0646"
  },
  {
    id: "p-lamp-12w",
    name: "\u0644\u0645\u0628\u0629 \u0644\u064A\u062F 12 \u0648\u0627\u062A \u0648\u0631\u0645 (\u0625\u0636\u0627\u0621\u0629 \u062F\u0627\u0641\u0626\u0629) \u0641\u064A\u0644\u064A\u0628\u0633 E27",
    category: "lighting_bulbs",
    brand: "\u0641\u064A\u0644\u064A\u0628\u0633",
    voltage: "220V",
    powerWatt: "12W",
    unit: "\u0642\u0637\u0639\u0629",
    purchasePrice: 48,
    sellingPrice: 68,
    wholesalePrice: 58,
    quantity: 95,
    minAlertQuantity: 15,
    barcode: "6223003002026",
    warrantyMonths: 24,
    notes: "\u0645\u0648\u0641\u0631\u0629 \u0644\u0644\u0637\u0627\u0642\u0629 85% \u0645\u0639 \u0639\u0645\u0631 \u0627\u0641\u062A\u0631\u0627\u0636\u064A 15,000 \u0633\u0627\u0639\u0629"
  },
  {
    id: "p-flood-50w",
    name: "\u0643\u0634\u0627\u0641 \u0644\u064A\u062F \u062E\u0627\u0631\u062C\u064A 50 \u0648\u0627\u062A \u0636\u062F \u0627\u0644\u0645\u0627\u0621 IP66 \u0633\u0627\u0637\u0639",
    category: "lighting_bulbs",
    brand: "\u0641\u064A\u0646\u0648\u0633 \u0625\u0643\u0633\u062A\u0631\u064A\u0645",
    voltage: "220V",
    powerWatt: "50W",
    unit: "\u0642\u0637\u0639\u0629",
    purchasePrice: 210,
    sellingPrice: 295,
    wholesalePrice: 260,
    quantity: 32,
    minAlertQuantity: 6,
    barcode: "6223003003030",
    warrantyMonths: 24,
    notes: "\u062C\u0633\u0645 \u0623\u0644\u0648\u0645\u0646\u064A\u0648\u0645 \u0645\u0635\u0641\u062D \u062A\u0628\u0631\u064A\u062F \u0639\u0627\u0644\u064A \u0645\u0639 \u0639\u062F\u0633\u0629 \u0632\u062C\u0627\u062C \u062D\u0631\u0627\u0631\u064A \u0644\u0644\u0648\u0627\u062C\u0647\u0627\u062A \u0648\u0627\u0644\u062D\u062F\u0627\u0626\u0642"
  },
  {
    id: "p-panel-6060",
    name: "\u0628\u0627\u0646\u0644 \u0644\u064A\u062F \u0633\u0642\u0641 \u063A\u0627\u0637\u0633 60\xD760 \u0633\u0645 48 \u0648\u0627\u062A \u0641\u064A\u0646\u0648\u0633 \u0625\u0636\u0627\u0621\u0629 \u0628\u064A\u0636\u0627\u0621",
    category: "lighting_bulbs",
    brand: "\u0641\u064A\u0646\u0648\u0633",
    voltage: "220V",
    powerWatt: "48W",
    unit: "\u0642\u0637\u0639\u0629",
    purchasePrice: 320,
    sellingPrice: 440,
    wholesalePrice: 390,
    quantity: 26,
    minAlertQuantity: 5,
    barcode: "6223003004044",
    warrantyMonths: 36,
    notes: "\u0644\u0644\u0634\u0631\u0643\u0627\u062A \u0648\u0627\u0644\u0645\u0643\u0627\u062A\u0628\u060C \u0625\u0636\u0627\u0621\u0629 \u0645\u062A\u062C\u0627\u0646\u0633\u0629 \u0645\u0631\u064A\u062D\u0629 \u0644\u0644\u0639\u064A\u0646 \u0645\u0639 \u062F\u0631\u0627\u064A\u0641\u0631 \u062A\u064A\u0627\u0631 \u0645\u0639\u0632\u0648\u0644"
  },
  {
    id: "p-spot-7w",
    name: "\u0633\u0628\u0648\u062A \u0644\u0627\u064A\u062A \u0644\u064A\u062F \u0645\u062A\u062D\u0631\u0643 7 \u0648\u0627\u062A COB \u062F\u0627\u064A \u0643\u0627\u0633\u062A \u0645\u0639 \u062F\u0631\u0627\u064A\u0641\u0631",
    category: "lighting_bulbs",
    brand: "\u062A\u0648\u0634\u064A\u0628\u0627 \u0633\u0645\u0627\u0631\u062A",
    voltage: "220V",
    powerWatt: "7W",
    unit: "\u0642\u0637\u0639\u0629",
    purchasePrice: 45,
    sellingPrice: 65,
    wholesalePrice: 54,
    quantity: 110,
    minAlertQuantity: 20,
    barcode: "6223003005058",
    warrantyMonths: 24,
    notes: "\u0642\u0637\u0631 \u0641\u062A\u062D\u0629 \u0627\u0644\u0633\u0642\u0641 7 \u0633\u0645\u060C \u0632\u0627\u0648\u064A\u0629 \u0625\u0636\u0627\u0621\u0629 \u0645\u0648\u062C\u0647\u0629 \u0644\u062F\u064A\u0643\u0648\u0631\u0627\u062A \u0627\u0644\u062C\u0628\u0633 \u0628\u0648\u0631\u062F"
  },
  {
    id: "p-strip-neon",
    name: "\u0634\u0631\u064A\u0637 \u0644\u064A\u062F \u0646\u064A\u0648\u0646 \u0641\u0644\u064A\u0643\u0633 220V \u0625\u0636\u0627\u0621\u0629 \u062F\u0627\u0641\u0626\u0629 (\u0628\u0643\u0631\u0629 50 \u0645\u062A\u0631)",
    category: "lighting_bulbs",
    brand: "\u0623\u0648\u0633\u0631\u0627\u0645 \u062A\u0643\u0646\u0648\u0644\u0648\u062C\u064A",
    voltage: "220V",
    unit: "\u0628\u0643\u0631\u0629",
    purchasePrice: 680,
    sellingPrice: 890,
    wholesalePrice: 790,
    quantity: 8,
    minAlertQuantity: 2,
    barcode: "6223003006062",
    warrantyMonths: 12,
    notes: "\u0634\u0631\u064A\u0637 \u0633\u064A\u0644\u064A\u0643\u0648\u0646 \u0645\u0631\u0646 \u0639\u0627\u0632\u0644 \u0644\u0644\u0645\u0627\u0621 IP67 \u0644\u0628\u064A\u062A \u0627\u0644\u0646\u0648\u0631 \u0648\u0627\u0644\u0648\u0627\u062C\u0647\u0627\u062A"
  },
  // 4. القواطع ولوحات التوزيع (Circuit Breakers & Panels)
  {
    id: "p-breaker-16a",
    name: "\u0642\u0627\u0637\u0639 \u0623\u0648\u062A\u0648\u0645\u0627\u062A\u064A\u0643 \u0623\u062D\u0627\u062F\u064A 16 \u0623\u0645\u0628\u064A\u0631 C16 \u0634\u0646\u0627\u064A\u062F\u0631 \u0625\u0644\u0643\u062A\u0631\u064A\u0643",
    category: "breakers_panels",
    brand: "\u0634\u0646\u0627\u064A\u062F\u0631 \u0625\u0644\u064A\u0643\u062A\u0631\u064A\u0643",
    voltage: "230/400V",
    amperage: "16A",
    unit: "\u0642\u0637\u0639\u0629",
    purchasePrice: 110,
    sellingPrice: 155,
    wholesalePrice: 135,
    quantity: 75,
    minAlertQuantity: 15,
    barcode: "6224004001019",
    warrantyMonths: 36,
    notes: "\u0642\u062F\u0631\u0629 \u0643\u0633\u0631 4.5kA \u0644\u062D\u0645\u0627\u064A\u0629 \u062F\u0648\u0627\u0626\u0631 \u0627\u0644\u0625\u0646\u0627\u0631\u0629 \u0648\u0627\u0644\u0628\u0631\u0627\u064A\u0632"
  },
  {
    id: "p-breaker-25a",
    name: "\u0642\u0627\u0637\u0639 \u0623\u0648\u062A\u0648\u0645\u0627\u062A\u064A\u0643 \u0623\u062D\u0627\u062F\u064A 25 \u0623\u0645\u0628\u064A\u0631 C25 \u0634\u0646\u0627\u064A\u062F\u0631 \u0625\u0644\u0643\u062A\u0631\u064A\u0643",
    category: "breakers_panels",
    brand: "\u0634\u0646\u0627\u064A\u062F\u0631 \u0625\u0644\u064A\u0643\u062A\u0631\u064A\u0643",
    voltage: "230/400V",
    amperage: "25A",
    unit: "\u0642\u0637\u0639\u0629",
    purchasePrice: 115,
    sellingPrice: 160,
    wholesalePrice: 140,
    quantity: 60,
    minAlertQuantity: 15,
    barcode: "6224004002023",
    warrantyMonths: 36,
    notes: "\u0642\u062F\u0631\u0629 \u0643\u0633\u0631 4.5kA \u0644\u062D\u0645\u0627\u064A\u0629 \u062E\u0637\u0648\u0637 \u0627\u0644\u062A\u0643\u064A\u064A\u0641 \u0648\u0627\u0644\u0633\u062E\u0627\u0646\u0627\u062A"
  },
  {
    id: "p-breaker-3p-63a",
    name: "\u0642\u0627\u0637\u0639 \u0623\u0648\u062A\u0648\u0645\u0627\u062A\u064A\u0643 \u062B\u0644\u0627\u062B\u064A 3 \u0641\u0627\u0632 63 \u0623\u0645\u0628\u064A\u0631 \u0634\u0646\u0627\u064A\u062F\u0631 \u0625\u0644\u0643\u062A\u0631\u064A\u0643",
    category: "breakers_panels",
    brand: "\u0634\u0646\u0627\u064A\u062F\u0631 \u0625\u0644\u064A\u0643\u062A\u0631\u064A\u0643",
    voltage: "400V",
    amperage: "63A",
    unit: "\u0642\u0637\u0639\u0629",
    purchasePrice: 480,
    sellingPrice: 650,
    wholesalePrice: 580,
    quantity: 18,
    minAlertQuantity: 4,
    barcode: "6224004003037",
    warrantyMonths: 36,
    notes: "\u0642\u0627\u0637\u0639 \u0639\u0645\u0648\u0645\u064A \u0644\u0644\u0648\u062D\u0627\u062A \u0627\u0644\u0634\u0642\u0642 \u0648\u0627\u0644\u0645\u0635\u0627\u0639\u062F \u0648\u0627\u0644\u0648\u0631\u0634 \u0642\u062F\u0631\u0629 \u0643\u0633\u0631 6kA"
  },
  {
    id: "p-panel-12line",
    name: "\u0644\u0648\u062D\u0629 \u0642\u0648\u0627\u0637\u0639 \u062A\u0648\u0632\u064A\u0639 \u063A\u0627\u0637\u0633 12 \u062E\u0637 \u0641\u064A\u0646\u0648\u0633 \u0628\u0627\u0628 \u0634\u0641\u0627\u0641 \u0645\u0639 \u0628\u0627\u0631\u0627\u062A \u0646\u062D\u0627\u0633",
    category: "breakers_panels",
    brand: "\u0641\u064A\u0646\u0648\u0633",
    unit: "\u0642\u0637\u0639\u0629",
    purchasePrice: 190,
    sellingPrice: 270,
    wholesalePrice: 235,
    quantity: 28,
    minAlertQuantity: 6,
    barcode: "6224004004041",
    warrantyMonths: 60,
    notes: "\u0639\u0644\u0628\u0629 \u0628\u0644\u0627\u0633\u062A\u064A\u0643 \u0628\u064A\u0636\u0627\u0621 \u0630\u0627\u062A\u064A\u0629 \u0627\u0644\u0625\u0637\u0641\u0627\u0621 \u0645\u0639 \u0645\u064A\u0632\u0627\u0646 \u0645\u0627\u0621 \u0644\u0644\u062A\u062B\u0628\u064A\u062A \u0627\u0644\u062F\u0642\u064A\u0642"
  },
  // 5. الخراطيم والمواسير ومستلزمات التأسيس (Conduits & Boxes)
  {
    id: "p-hose-16",
    name: "\u0644\u0641\u0629 \u062E\u0631\u0637\u0648\u0645 \u0633\u0648\u0633\u062A\u0629 \u0645\u0631\u0646 \u0645\u0635\u0637\u0641\u0649 \u0645\u062D\u0645\u0648\u062F 16 \u0645\u0645 (50 \u0645\u062A\u0631)",
    category: "pipes_conduits",
    brand: "\u0645\u0635\u0637\u0641\u0649 \u0645\u062D\u0645\u0648\u062F",
    unit: "\u0644\u0641\u0629",
    purchasePrice: 140,
    sellingPrice: 195,
    wholesalePrice: 175,
    quantity: 35,
    minAlertQuantity: 8,
    barcode: "6225005001016",
    notes: "\u062E\u0631\u0637\u0648\u0645 \u0645\u0642\u0627\u0648\u0645 \u0644\u0644\u0627\u0646\u0636\u063A\u0627\u0637 \u0644\u0635\u0628 \u0627\u0644\u062E\u0631\u0633\u0627\u0646\u0627\u062A \u0648\u0627\u0644\u0623\u0633\u0642\u0641"
  },
  {
    id: "p-box-1010",
    name: "\u0628\u0648\u0627\u0637 \u062A\u062C\u0645\u064A\u0639 \u062E\u0627\u0631\u062C\u064A 10\xD710 \u0633\u0645 \u0636\u062F \u0627\u0644\u0645\u0637\u0631 IP55 \u0645\u0639 \u062C\u0648\u0627\u0646 \u0643\u0627\u0648\u062A\u0634",
    category: "pipes_conduits",
    brand: "\u0627\u0644\u0623\u0647\u0631\u0627\u0645 \u0644\u0644\u0628\u0644\u0627\u0633\u062A\u064A\u0643",
    unit: "\u0642\u0637\u0639\u0629",
    purchasePrice: 18,
    sellingPrice: 28,
    wholesalePrice: 23,
    quantity: 90,
    minAlertQuantity: 20,
    barcode: "6225005002020",
    notes: "\u0628\u0648\u0627\u0637 \u0628\u0644\u0627\u0633\u062A\u064A\u0643 \u0631\u0645\u0627\u062F\u064A \u0644\u0644\u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u062E\u0627\u0631\u062C\u064A\u0629 \u0648\u062A\u062C\u0645\u064A\u0639 \u0627\u0644\u0643\u0627\u0645\u064A\u0631\u0627\u062A \u0648\u0627\u0644\u0625\u0646\u0627\u0631\u0629"
  },
  // 6. العدد وأجهزة القياس (Tools & Meters)
  {
    id: "p-multimeter",
    name: "\u0645\u0644\u062A\u064A\u0645\u064A\u062A\u0631 \u0641\u062D\u0635 \u0643\u0647\u0631\u0628\u0627\u0626\u064A \u062F\u064A\u062C\u064A\u062A\u0627\u0644 \u0645\u062D\u062A\u0631\u0641 \u0645\u0639 \u0634\u0627\u0634\u0629 \u0645\u0636\u064A\u0626\u0629 \u0648\u0628\u0627\u0632\u0631",
    category: "tools_meters",
    brand: "\u064A\u0648\u0646\u064A \u062A\u064A (UNI-T)",
    voltage: "600V AC/DC",
    unit: "\u0642\u0637\u0639\u0629",
    purchasePrice: 280,
    sellingPrice: 395,
    wholesalePrice: 345,
    quantity: 15,
    minAlertQuantity: 3,
    barcode: "6226006001013",
    warrantyMonths: 12,
    notes: "\u0644\u0642\u064A\u0627\u0633 \u0627\u0644\u0641\u0648\u0644\u062A \u0648\u0627\u0644\u0623\u0648\u0645 \u0648\u0627\u0644\u0623\u0645\u0628\u064A\u0631 \u0648\u0641\u062D\u0635 \u0627\u0644\u062A\u0648\u0635\u064A\u0644\u064A\u0629 \u0648\u0627\u0644\u062F\u0627\u064A\u0648\u062F"
  },
  {
    id: "p-clampmeter",
    name: "\u0628\u0646\u0633\u0629 \u0623\u0645\u0628\u064A\u0631 \u062F\u064A\u062C\u064A\u062A\u0627\u0644 \u0643\u0644\u064A\u0628 \u0645\u064A\u062A\u0631 \u0644\u0642\u064A\u0627\u0633 \u0627\u0644\u0623\u062D\u0645\u0627\u0644 \u0648\u0627\u0644\u062A\u064A\u0627\u0631 400A",
    category: "tools_meters",
    brand: "\u064A\u0648\u0646\u064A \u062A\u064A (UNI-T)",
    amperage: "400A",
    unit: "\u0642\u0637\u0639\u0629",
    purchasePrice: 450,
    sellingPrice: 630,
    wholesalePrice: 560,
    quantity: 12,
    minAlertQuantity: 3,
    barcode: "6226006002027",
    warrantyMonths: 12,
    notes: "\u0644\u0642\u064A\u0627\u0633 \u0633\u062D\u0628 \u0627\u0644\u0623\u0645\u0628\u064A\u0631 \u062F\u0648\u0646 \u0642\u0637\u0639 \u0627\u0644\u0633\u0644\u0643 \u0641\u0627\u0626\u0642 \u0627\u0644\u062F\u0642\u0629"
  },
  {
    id: "p-tester-pen",
    name: "\u0645\u0641\u0643 \u0641\u062D\u0635 \u0648\u062A\u0633\u062A \u0643\u0647\u0631\u0628\u0627\u0626\u064A \u0623\u0644\u0645\u0627\u0646\u064A \u0645\u0639 \u0644\u0645\u0628\u0629 \u0646\u064A\u0648\u0646 \u0628\u064A\u0636\u0627\u0621",
    category: "tools_meters",
    brand: "\u0633\u062A\u0627\u0646\u0644\u064A \u0623\u0644\u0645\u0627\u0646\u064A",
    voltage: "100-500V",
    unit: "\u0642\u0637\u0639\u0629",
    purchasePrice: 25,
    sellingPrice: 40,
    wholesalePrice: 32,
    quantity: 85,
    minAlertQuantity: 15,
    barcode: "6226006003031",
    notes: "\u0645\u0641\u0643 \u0635\u0644\u0628 \u0639\u0627\u0632\u0644 \u0644\u0644\u0643\u0647\u0631\u0628\u0627\u0621 \u0644\u0644\u0643\u0634\u0641 \u0639\u0646 \u0627\u0644\u0637\u0631\u0641 \u0627\u0644\u062D\u064A (\u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0621)"
  },
  // 7. المستلزمات والإكسسوارات (Accessories)
  {
    id: "p-tape-isolin",
    name: "\u0634\u0631\u064A\u0637 \u0644\u062D\u0627\u0645 \u0643\u0647\u0631\u0628\u0627\u0626\u064A \u0625\u064A\u0632\u0648\u0644\u064A\u0646 \u0639\u0627\u0632\u0644 \u0623\u0635\u0644\u064A (\u062F\u0633\u062A\u0629 10 \u0628\u0643\u0631\u0627\u062A)",
    category: "accessories",
    brand: "\u0625\u064A\u0632\u0648\u0644\u064A\u0646 \u0625\u064A\u0637\u0627\u0644\u064A",
    unit: "\u0639\u0644\u0628\u0629",
    purchasePrice: 45,
    sellingPrice: 65,
    wholesalePrice: 55,
    quantity: 60,
    minAlertQuantity: 10,
    barcode: "6227007001010",
    notes: "\u0634\u0631\u064A\u0637 \u0639\u0627\u0632\u0644 \u0639\u0627\u0644\u064A \u0627\u0644\u0645\u0631\u0648\u0646\u0629 \u0648\u0627\u0644\u0627\u0644\u062A\u0635\u0627\u0642 \u063A\u064A\u0631 \u0642\u0627\u0628\u0644 \u0644\u0644\u0627\u0634\u062A\u0639\u0627\u0644"
  },
  // -------------------------------------------------------------
  // ASSEMBLED / COMPOSITE PRODUCTS (أصناف مجمعة / باقات جاهزة)
  // -------------------------------------------------------------
  {
    id: "p-kit-panel-assembled",
    name: "\u0644\u0648\u062D\u0629 \u062A\u0648\u0632\u064A\u0639 12 \u062E\u0637 \u0645\u062C\u0647\u0632\u0629 \u0648\u062C\u0627\u0647\u0632\u0629 \u0644\u0644\u062A\u0631\u0643\u064A\u0628 (\u0642\u0648\u0627\u0637\u0639 \u0634\u0646\u0627\u064A\u062F\u0631 + \u0628\u0627\u0631\u0627\u062A)",
    category: "breakers_panels",
    brand: "\u062A\u062C\u0645\u064A\u0639 \u0648\u0633\u0627\u0645 \u0644\u0644\u0643\u0647\u0631\u0628\u0627\u0621",
    voltage: "230/400V",
    unit: "\u0637\u0642\u0645",
    purchasePrice: 1420,
    // Sum of parts + labor
    sellingPrice: 1950,
    wholesalePrice: 1780,
    quantity: 6,
    minAlertQuantity: 2,
    barcode: "6228008001017",
    warrantyMonths: 36,
    isComposite: true,
    recipeId: "recipe-panel-12",
    notes: "\u0644\u0648\u062D\u0629 12 \u062E\u0637 + \u0642\u0627\u0637\u0639 \u0639\u0645\u0648\u0645\u064A 63A + 4 \u0642\u0648\u0627\u0637\u0639 16A + 4 \u0642\u0648\u0627\u0637\u0639 25A + \u0628\u0627\u0631\u0627\u062A \u0646\u062D\u0627\u0633 \u0645\u062C\u0645\u0639\u0629 \u0639\u0644\u0649 \u064A\u062F \u0641\u0646\u064A\u064A\u0646 \u0645\u062D\u062A\u0631\u0641\u064A\u0646"
  },
  {
    id: "p-kit-room-finish",
    name: "\u0637\u0642\u0645 \u062A\u0634\u0637\u064A\u0628 \u063A\u0631\u0641\u0629 \u0646\u0648\u0645 / \u0635\u0627\u0644\u0648\u0646 \u0645\u062A\u0643\u0627\u0645\u0644 \u0641\u064A\u0646\u0648\u0633 (\u0634\u0627\u0633\u064A\u0647\u0627\u062A + \u0648\u0634\u0648\u0634 + \u0644\u0642\u0645)",
    category: "switches_sockets",
    brand: "\u062A\u062C\u0645\u064A\u0639 \u0648\u0633\u0627\u0645 \u0644\u0644\u0643\u0647\u0631\u0628\u0627\u0621",
    unit: "\u0637\u0642\u0645",
    purchasePrice: 420,
    sellingPrice: 580,
    wholesalePrice: 510,
    quantity: 10,
    minAlertQuantity: 3,
    barcode: "6228008002021",
    warrantyMonths: 24,
    isComposite: true,
    recipeId: "recipe-room-finish",
    notes: "\u0637\u0642\u0645 \u0645\u062A\u0643\u0627\u0645\u0644 \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 6 \u0634\u0627\u0633\u064A\u0647 + 6 \u0648\u0634 \u0641\u064A\u0646\u0648\u0633 + 4 \u0644\u0642\u0645\u0629 \u0645\u0641\u062A\u0627\u062D + 8 \u0644\u0642\u0645\u0629 \u0628\u0631\u064A\u0632\u0629 \u0623\u0645\u0627\u0646"
  },
  {
    id: "p-kit-flood-cord",
    name: "\u0628\u0627\u0642\u0629 \u0643\u0634\u0627\u0641 \u0644\u064A\u062F \u062E\u0627\u0631\u062C\u064A 50 \u0648\u0627\u062A \u0645\u062C\u0647\u0632 \u0645\u0639 \u0643\u0627\u0628\u0644 5 \u0645\u062A\u0631 \u0648\u0641\u064A\u0634\u0629 \u0630\u0643\u0631 \u0645\u062D\u0645\u0644\u0629",
    category: "lighting_bulbs",
    brand: "\u062A\u062C\u0645\u064A\u0639 \u0648\u0633\u0627\u0645 \u0644\u0644\u0643\u0647\u0631\u0628\u0627\u0621",
    voltage: "220V",
    powerWatt: "50W",
    unit: "\u0637\u0642\u0645",
    purchasePrice: 285,
    sellingPrice: 395,
    wholesalePrice: 350,
    quantity: 8,
    minAlertQuantity: 2,
    barcode: "6228008003035",
    warrantyMonths: 24,
    isComposite: true,
    recipeId: "recipe-flood-cord",
    notes: "\u062C\u0627\u0647\u0632 \u0644\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0641\u0648\u0631\u064A \u0644\u0644\u0645\u062D\u0644\u0627\u062A \u0648\u0627\u0644\u062D\u062F\u0627\u0626\u0642 \u0648\u0627\u0644\u0645\u0648\u0627\u0642\u0639 \u0645\u0639 \u062A\u0648\u0635\u064A\u0644 \u0645\u0639\u0632\u0648\u0644 \u0636\u062F \u0627\u0644\u0645\u0627\u0621"
  }
];
var INITIAL_RECIPES = [
  {
    id: "recipe-panel-12",
    name: "\u0644\u0648\u062D\u0629 \u0642\u0648\u0627\u0637\u0639 \u062A\u0648\u0632\u064A\u0639 12 \u062E\u0637 \u0645\u062C\u0647\u0632\u0629 \u0634\u0646\u0627\u064A\u062F\u0631",
    outputProductId: "p-kit-panel-assembled",
    outputProductName: "\u0644\u0648\u062D\u0629 \u062A\u0648\u0632\u064A\u0639 12 \u062E\u0637 \u0645\u062C\u0647\u0632\u0629 \u0648\u062C\u0627\u0647\u0632\u0629 \u0644\u0644\u062A\u0631\u0643\u064A\u0628 (\u0642\u0648\u0627\u0637\u0639 \u0634\u0646\u0627\u064A\u062F\u0631 + \u0628\u0627\u0631\u0627\u062A)",
    outputQuantity: 1,
    outputUnit: "\u0637\u0642\u0645",
    laborCost: 100,
    // مصنعية التجميع والتقفيل
    totalEstimatedCost: 1420,
    notes: "\u064A\u062A\u0645 \u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0623\u0633\u0644\u0627\u0643 \u062A\u0631\u0645\u064A\u0644 \u0646\u062D\u0627\u0633 \u0648\u0628\u0627\u0631\u0627\u062A \u0623\u0635\u0644\u064A\u0629 \u0644\u0631\u0628\u0637 \u0627\u0644\u0642\u0648\u0627\u0637\u0639 \u0628\u0625\u062D\u0643\u0627\u0645 \u0648\u0627\u062E\u062A\u0628\u0627\u0631 \u0627\u0644\u0639\u0632\u0644",
    createdAt: "2026-02-01T10:00:00Z",
    components: [
      {
        productId: "p-panel-12line",
        productName: "\u0644\u0648\u062D\u0629 \u0642\u0648\u0627\u0637\u0639 \u062A\u0648\u0632\u064A\u0639 \u063A\u0627\u0637\u0633 12 \u062E\u0637 \u0641\u064A\u0646\u0648\u0633 \u0628\u0627\u0628 \u0634\u0641\u0627\u0641 \u0645\u0639 \u0628\u0627\u0631\u0627\u062A \u0646\u062D\u0627\u0633",
        quantity: 1,
        unit: "\u0642\u0637\u0639\u0629",
        unitCost: 190,
        totalCost: 190
      },
      {
        productId: "p-breaker-3p-63a",
        productName: "\u0642\u0627\u0637\u0639 \u0623\u0648\u062A\u0648\u0645\u0627\u062A\u064A\u0643 \u062B\u0644\u0627\u062B\u064A 3 \u0641\u0627\u0632 63 \u0623\u0645\u0628\u064A\u0631 \u0634\u0646\u0627\u064A\u062F\u0631 \u0625\u0644\u0643\u062A\u0631\u064A\u0643",
        quantity: 1,
        unit: "\u0642\u0637\u0639\u0629",
        unitCost: 480,
        totalCost: 480
      },
      {
        productId: "p-breaker-16a",
        productName: "\u0642\u0627\u0637\u0639 \u0623\u0648\u062A\u0648\u0645\u0627\u062A\u064A\u0643 \u0623\u062D\u0627\u062F\u064A 16 \u0623\u0645\u0628\u064A\u0631 C16 \u0634\u0646\u0627\u064A\u062F\u0631 \u0625\u0644\u0643\u062A\u0631\u064A\u0643",
        quantity: 4,
        unit: "\u0642\u0637\u0639\u0629",
        unitCost: 110,
        totalCost: 440
      },
      {
        productId: "p-breaker-25a",
        productName: "\u0642\u0627\u0637\u0639 \u0623\u0648\u062A\u0648\u0645\u0627\u062A\u064A\u0643 \u0623\u062D\u0627\u062F\u064A 25 \u0623\u0645\u0628\u064A\u0631 C25 \u0634\u0646\u0627\u064A\u062F\u0631 \u0625\u0644\u0643\u062A\u0631\u064A\u0643",
        quantity: 2,
        unit: "\u0642\u0637\u0639\u0629",
        unitCost: 115,
        totalCost: 230
      }
    ]
  },
  {
    id: "recipe-room-finish",
    name: "\u0637\u0642\u0645 \u062A\u0634\u0637\u064A\u0628 \u062D\u062C\u0631\u0629 \u0643\u0647\u0631\u0628\u0627\u0621 \u0641\u064A\u0646\u0648\u0633 \u0645\u062A\u0643\u0627\u0645\u0644",
    outputProductId: "p-kit-room-finish",
    outputProductName: "\u0637\u0642\u0645 \u062A\u0634\u0637\u064A\u0628 \u063A\u0631\u0641\u0629 \u0646\u0648\u0645 / \u0635\u0627\u0644\u0648\u0646 \u0645\u062A\u0643\u0627\u0645\u0644 \u0641\u064A\u0646\u0648\u0633 (\u0634\u0627\u0633\u064A\u0647\u0627\u062A + \u0648\u0634\u0648\u0634 + \u0644\u0642\u0645)",
    outputQuantity: 1,
    outputUnit: "\u0637\u0642\u0645",
    laborCost: 20,
    // تغليف وتجميع
    totalEstimatedCost: 420,
    notes: "\u0628\u0627\u0642\u0629 \u062A\u0634\u0637\u064A\u0628 \u0645\u062C\u0645\u0639\u0629 \u0628\u062E\u0635\u0645 \u062E\u0627\u0635 \u0644\u0644\u0639\u0645\u0644\u0627\u0621 \u0648\u0627\u0644\u0645\u0642\u0627\u0648\u0644\u064A\u0646 \u062C\u0627\u0647\u0632\u0629 \u0644\u0644\u062A\u0631\u0643\u064A\u0628",
    createdAt: "2026-02-10T11:00:00Z",
    components: [
      {
        productId: "p-chassis-magic",
        productName: "\u0634\u0627\u0633\u064A\u0647 \u0645\u0627\u062C\u064A\u0643 \u062D\u062F\u064A\u062F \u0645\u0642\u0648\u0649 \u0641\u064A\u0646\u0648\u0633 \u0645\u0639 \u0645\u0633\u0627\u0645\u064A\u0631 \u0627\u0644\u062A\u062B\u0628\u064A\u062A",
        quantity: 6,
        unit: "\u0642\u0637\u0639\u0629",
        unitCost: 8,
        totalCost: 48
      },
      {
        productId: "p-face-venus",
        productName: "\u0648\u0634 \u0645\u0627\u062C\u064A\u0643 3 \u0641\u062A\u062D\u0629 \u0643\u0644\u0627\u0633\u064A\u0643 \u0641\u064A\u0646\u0648\u0633 \u0639\u0627\u062C\u064A",
        quantity: 6,
        unit: "\u0642\u0637\u0639\u0629",
        unitCost: 12,
        totalCost: 72
      },
      {
        productId: "p-sw-venus",
        productName: "\u0644\u0642\u0645\u0629 \u0645\u0641\u062A\u0627\u062D \u0625\u0646\u0627\u0631\u0629 \u0639\u0631\u064A\u0636 16 \u0623\u0645\u0628\u064A\u0631 \u0641\u064A\u0646\u0648\u0633 \u0628\u064A\u062C",
        quantity: 4,
        unit: "\u0642\u0637\u0639\u0629",
        unitCost: 22,
        totalCost: 88
      },
      {
        productId: "p-sock-schneider",
        productName: "\u0644\u0642\u0645\u0629 \u0628\u0631\u064A\u0632\u0629 \u0645\u0641\u0631\u062F\u0629 \u0634\u0646\u0627\u064A\u062F\u0631 \u0623\u0635\u0644\u064A \u0645\u0639 \u0637\u0631\u0641 \u062A\u0623\u0631\u064A\u0636 16A",
        quantity: 6,
        unit: "\u0642\u0637\u0639\u0629",
        unitCost: 28,
        totalCost: 168
      },
      {
        productId: "p-sw-deviateur",
        productName: "\u0645\u0641\u062A\u0627\u062D \u062F\u064A\u0641\u064A\u0627\u062A\u064A\u0631 (\u0637\u0631\u0641 \u0633\u0644\u0645) 16A \u0641\u064A\u0646\u0648\u0633",
        quantity: 1,
        unit: "\u0642\u0637\u0639\u0629",
        unitCost: 26,
        totalCost: 26
      }
    ]
  },
  {
    id: "recipe-flood-cord",
    name: "\u0643\u0634\u0627\u0641 \u0644\u064A\u062F 50 \u0648\u0627\u062A \u0645\u062C\u0647\u0632 \u0628\u0643\u0627\u0628\u0644 \u062A\u0648\u0635\u064A\u0644 \u0648\u0641\u064A\u0634\u0629",
    outputProductId: "p-kit-flood-cord",
    outputProductName: "\u0628\u0627\u0642\u0629 \u0643\u0634\u0627\u0641 \u0644\u064A\u062F \u062E\u0627\u0631\u062C\u064A 50 \u0648\u0627\u062A \u0645\u062C\u0647\u0632 \u0645\u0639 \u0643\u0627\u0628\u0644 5 \u0645\u062A\u0631 \u0648\u0641\u064A\u0634\u0629 \u0630\u0643\u0631 \u0645\u062D\u0645\u0644\u0629",
    outputQuantity: 1,
    outputUnit: "\u0637\u0642\u0645",
    laborCost: 35,
    totalEstimatedCost: 285,
    notes: "\u0643\u0634\u0627\u0641 50W \u0645\u0639 \u0633\u0644\u0643 \u0633\u0648\u064A\u062F\u064A 2\xD71.5\u0645\u0645 \u0628\u0637\u0648\u0644 5 \u0645\u062A\u0631 \u0648\u0641\u064A\u0634\u0629 \u0623\u0645\u0627\u0646",
    createdAt: "2026-02-15T12:00:00Z",
    components: [
      {
        productId: "p-flood-50w",
        productName: "\u0643\u0634\u0627\u0641 \u0644\u064A\u062F \u062E\u0627\u0631\u062C\u064A 50 \u0648\u0627\u062A \u0636\u062F \u0627\u0644\u0645\u0627\u0621 IP66 \u0633\u0627\u0637\u0639",
        quantity: 1,
        unit: "\u0642\u0637\u0639\u0629",
        unitCost: 210,
        totalCost: 210
      },
      {
        productId: "p-wire-15",
        productName: "\u0633\u0644\u0643 \u0646\u062D\u0627\u0633 \u0645\u0639\u0632\u0648\u0644 1.5 \u0645\u0645 \u0633\u0648\u064A\u062F\u064A \u0623\u0635\u0644\u064A (\u0644\u0641\u0629 100\u0645)",
        quantity: 0.05,
        // 5 أمتار (0.05 من اللفة)
        unit: "\u0644\u0641\u0629",
        unitCost: 950,
        totalCost: 47.5
      }
    ]
  }
];
var INITIAL_ASSEMBLY_OPERATIONS = [
  {
    id: "asm-op-1",
    operationNumber: "ASM-2026-001",
    type: "assembly",
    recipeId: "recipe-panel-12",
    recipeName: "\u0644\u0648\u062D\u0629 \u0642\u0648\u0627\u0637\u0639 \u062A\u0648\u0632\u064A\u0639 12 \u062E\u0637 \u0645\u062C\u0647\u0632\u0629 \u0634\u0646\u0627\u064A\u062F\u0631",
    targetProductId: "p-kit-panel-assembled",
    targetProductName: "\u0644\u0648\u062D\u0629 \u062A\u0648\u0632\u064A\u0639 12 \u062E\u0637 \u0645\u062C\u0647\u0632\u0629 \u0648\u062C\u0627\u0647\u0632\u0629 \u0644\u0644\u062A\u0631\u0643\u064A\u0628 (\u0642\u0648\u0627\u0637\u0639 \u0634\u0646\u0627\u064A\u062F\u0631 + \u0628\u0627\u0631\u0627\u062A)",
    quantity: 4,
    unit: "\u0637\u0642\u0645",
    totalCost: 5680,
    laborCost: 400,
    operatorName: "\u0645\u062D\u0645\u0648\u062F \u0623\u0645\u064A\u0646 \u0627\u0644\u0645\u062E\u0632\u0646 \u0648\u0627\u0644\u062A\u062C\u0645\u064A\u0639",
    date: "2026-10-15T14:30:00Z",
    notes: "\u062A\u0645 \u062A\u062C\u0645\u064A\u0639 \u0648\u0627\u062E\u062A\u0628\u0627\u0631 4 \u0644\u0648\u062D\u0627\u062A \u062A\u0648\u0632\u064A\u0639 \u0643\u0627\u0645\u0644\u0629 \u062C\u0627\u0647\u0632\u0629 \u0644\u0644\u062A\u0633\u0644\u064A\u0645 \u0641\u064A \u0627\u0644\u0645\u062E\u0632\u0646",
    componentsAffected: [
      {
        productId: "p-panel-12line",
        productName: "\u0644\u0648\u062D\u0629 \u0642\u0648\u0627\u0637\u0639 \u062A\u0648\u0632\u064A\u0639 \u063A\u0627\u0637\u0633 12 \u062E\u0637 \u0641\u064A\u0646\u0648\u0633 \u0628\u0627\u0628 \u0634\u0641\u0627\u0641 \u0645\u0639 \u0628\u0627\u0631\u0627\u062A \u0646\u062D\u0627\u0633",
        quantity: 4,
        unit: "\u0642\u0637\u0639\u0629",
        unitCost: 190,
        totalCost: 760,
        direction: "deducted"
      },
      {
        productId: "p-breaker-3p-63a",
        productName: "\u0642\u0627\u0637\u0639 \u0623\u0648\u062A\u0648\u0645\u0627\u062A\u064A\u0643 \u062B\u0644\u0627\u062B\u064A 3 \u0641\u0627\u0632 63 \u0623\u0645\u0628\u064A\u0631 \u0634\u0646\u0627\u064A\u062F\u0631 \u0625\u0644\u0643\u062A\u0631\u064A\u0643",
        quantity: 4,
        unit: "\u0642\u0637\u0639\u0629",
        unitCost: 480,
        totalCost: 1920,
        direction: "deducted"
      },
      {
        productId: "p-breaker-16a",
        productName: "\u0642\u0627\u0637\u0639 \u0623\u0648\u062A\u0648\u0645\u0627\u062A\u064A\u0643 \u0623\u062D\u0627\u062F\u064A 16 \u0623\u0645\u0628\u064A\u0631 C16 \u0634\u0646\u0627\u064A\u062F\u0631 \u0625\u0644\u0643\u062A\u0631\u064A\u0643",
        quantity: 16,
        unit: "\u0642\u0637\u0639\u0629",
        unitCost: 110,
        totalCost: 1760,
        direction: "deducted"
      },
      {
        productId: "p-breaker-25a",
        productName: "\u0642\u0627\u0637\u0639 \u0623\u0648\u062A\u0648\u0645\u0627\u062A\u064A\u0643 \u0623\u062D\u0627\u062F\u064A 25 \u0623\u0645\u0628\u064A\u0631 C25 \u0634\u0646\u0627\u064A\u062F\u0631 \u0625\u0644\u0643\u062A\u0631\u064A\u0643",
        quantity: 8,
        unit: "\u0642\u0637\u0639\u0629",
        unitCost: 115,
        totalCost: 920,
        direction: "deducted"
      }
    ]
  }
];
var INITIAL_CUSTOMERS = [
  {
    id: "cust-1",
    name: "\u0627\u0644\u0645\u0642\u0627\u0648\u0644 \u062D\u0633\u0646 \u0627\u0644\u0635\u0627\u0648\u064A (\u0634\u0631\u0643\u0629 \u0627\u0644\u0635\u0627\u0648\u064A \u0644\u0644\u0645\u0642\u0627\u0648\u0644\u0627\u062A \u0648\u0627\u0644\u062F\u064A\u0643\u0648\u0631)",
    phone: "01012345678",
    address: "\u0627\u0644\u062A\u062C\u0645\u0639 \u0627\u0644\u062E\u0627\u0645\u0633 - \u0627\u0644\u0642\u0627\u0647\u0631\u0629 \u0627\u0644\u062C\u062F\u064A\u062F\u0629",
    customerType: "contractor",
    commercialRecord: "\u0633.\u062A: 45019 / \u0628.\u0636: 190-340",
    currentBalance: 14500,
    // مديونية عليه للمتجر
    creditLimit: 5e4,
    notes: "\u0639\u0645\u064A\u0644 \u0645\u0642\u0627\u0648\u0644\u0627\u062A \u0645\u062A\u0645\u064A\u0632\u060C \u0645\u0634\u062A\u0631\u064A\u0627\u062A \u0645\u0646\u062A\u0638\u0645\u0629 \u0644\u0644\u0645\u0634\u0627\u0631\u064A\u0639 \u0648\u0627\u0644\u0641\u0644\u0644",
    createdAt: "2026-01-10T12:00:00Z"
  },
  {
    id: "cust-2",
    name: "\u0627\u0644\u0623\u0633\u0637\u0649 \u0625\u0628\u0631\u0627\u0647\u064A\u0645 \u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0626\u064A (\u0641\u0646\u064A \u062A\u0645\u062F\u064A\u062F\u0627\u062A \u0645\u0646\u0627\u0632\u0644)",
    phone: "01198765432",
    address: "\u0634\u0628\u0631\u0627 \u0627\u0644\u062E\u064A\u0645\u0629 - \u0627\u0644\u0642\u0644\u064A\u0648\u0628\u064A\u0629",
    customerType: "technician",
    currentBalance: 3200,
    creditLimit: 15e3,
    notes: "\u0641\u0646\u064A \u062A\u0623\u0633\u064A\u0633 \u0643\u0647\u0631\u0628\u0627\u0621 \u0645\u0639\u062A\u0645\u062F\u060C \u064A\u0633\u062A\u0641\u064A\u062F \u0645\u0646 \u0623\u0633\u0639\u0627\u0631 \u0627\u0644\u062C\u0645\u0644\u0629",
    createdAt: "2026-01-15T14:30:00Z"
  },
  {
    id: "cust-3",
    name: "\u0627\u0644\u0645\u0647\u0646\u062F\u0633 \u0637\u0627\u0631\u0642 \u0639\u0628\u062F \u0627\u0644\u0645\u0646\u0639\u0645 (\u0645\u0627\u0644\u0643 \u0634\u0642\u0629 \u0628\u0631\u062C \u0627\u0644\u0635\u0641\u0648\u0629)",
    phone: "01234567890",
    address: "\u0645\u062F\u064A\u0646\u0629 \u0646\u0635\u0631 - \u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0633\u0627\u062F\u0633\u0629",
    customerType: "retail",
    currentBalance: 0,
    creditLimit: 5e3,
    notes: "\u0639\u0645\u064A\u0644 \u0642\u0637\u0627\u0639\u064A \u0646\u0642\u062F\u064A\u060C \u062A\u0634\u0637\u064A\u0628 \u0634\u0642\u0629 \u0633\u0643\u0646\u064A\u0629",
    createdAt: "2026-02-01T09:15:00Z"
  },
  {
    id: "cust-4",
    name: "\u0634\u0631\u0643\u0629 \u0627\u0644\u0646\u0648\u0631 \u0644\u0644\u0645\u0642\u0627\u0648\u0644\u0627\u062A \u0648\u0627\u0644\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0639\u0642\u0627\u0631\u064A",
    phone: "01055566677",
    address: "\u0627\u0644\u0645\u0639\u0627\u062F\u064A - \u0634\u0627\u0631\u0639 \u0627\u0644\u0646\u0635\u0631",
    customerType: "company",
    commercialRecord: "\u0633.\u062A: 89012 / \u0628.\u0636: 660-880",
    currentBalance: 38e3,
    creditLimit: 1e5,
    notes: "\u062A\u0648\u0631\u064A\u062F\u0627\u062A \u0643\u0647\u0631\u0628\u0627\u0626\u064A\u0629 \u0644\u0645\u0634\u0631\u0648\u0639 \u0639\u0645\u0627\u0626\u0631 \u0633\u0643\u0646\u064A\u0629 \u0628\u0627\u0644\u0634\u0631\u0648\u0642",
    createdAt: "2026-02-05T16:00:00Z"
  }
];
var INITIAL_SUPPLIERS = [
  {
    id: "supp-1",
    name: "\u0634\u0631\u0643\u0629 \u0627\u0644\u0633\u0648\u064A\u062F\u064A \u0644\u0644\u0643\u0627\u0628\u0644\u0627\u062A \u0648\u0627\u0644\u0623\u0633\u0644\u0627\u0643 (\u0627\u0644\u062A\u0648\u0643\u064A\u0644 \u0627\u0644\u0631\u0626\u064A\u0633\u064A)",
    representativeName: "\u0627\u0644\u0623\u0633\u062A\u0627\u0630 \u0648\u0627\u0626\u0644 \u0641\u0647\u0645\u064A (\u0645\u0646\u062F\u0648\u0628 \u0627\u0644\u0633\u0648\u064A\u062F\u064A)",
    phone: "01011122233",
    address: "\u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0635\u0646\u0627\u0639\u064A\u0629 - \u0627\u0644\u0639\u0627\u0634\u0631 \u0645\u0646 \u0631\u0645\u0636\u0627\u0646",
    suppliedCategories: "\u0623\u0633\u0644\u0627\u0643 \u0646\u062D\u0627\u0633 \u0645\u0639\u0632\u0648\u0644\u060C \u0643\u0627\u0628\u0644\u0627\u062A \u0623\u0644\u0648\u0645\u0646\u064A\u0648\u0645\u060C \u0643\u0627\u0628\u0644\u0627\u062A \u0645\u0633\u0644\u062D\u0629",
    initialBalance: 42e3,
    currentBalance: 42e3,
    // مستحقات للشركة
    notes: "\u0633\u062F\u0627\u062F \u0628\u0634\u064A\u0643\u0627\u062A \u0623\u0648 \u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0628\u0646\u0643\u064A\u0629 \u0628\u0641\u062A\u0631\u0629 \u0633\u0645\u0627\u062D 30 \u064A\u0648\u0645",
    createdAt: "2026-01-01T08:00:00Z"
  },
  {
    id: "supp-2",
    name: "\u0634\u0631\u0643\u0629 \u0641\u064A\u0646\u0648\u0633 \u0644\u0644\u0635\u0646\u0627\u0639\u0627\u062A \u0648\u0627\u0644\u062D\u0644\u0648\u0644 \u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0626\u064A\u0629",
    representativeName: "\u0645/ \u0633\u0627\u0645\u062D \u0639\u0628\u062F \u0627\u0644\u0639\u0632\u064A\u0632",
    phone: "01033344455",
    address: "\u0645\u062F\u064A\u0646\u0629 \u0627\u0644\u0639\u0628\u0648\u0631 - \u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0635\u0646\u0627\u0639\u064A\u0629 \u0628/\u062C",
    suppliedCategories: "\u0645\u0641\u0627\u062A\u064A\u062D\u060C \u0628\u0631\u0627\u064A\u0632\u060C \u0644\u0648\u062D\u0627\u062A \u0642\u0648\u0627\u0637\u0639\u060C \u0644\u0645\u0628\u0627\u062A \u0644\u064A\u062F \u0648\u0628\u0627\u0646\u0644\u0627\u062A",
    initialBalance: 18500,
    currentBalance: 18500,
    notes: "\u0648\u0643\u064A\u0644 \u0645\u0628\u0627\u0634\u0631 \u0645\u0639 \u062E\u0635\u0645 \u0625\u0636\u0627\u0641\u064A \u0644\u0644\u0628\u0648\u0646\u0635 \u0627\u0644\u0634\u0647\u0631\u064A",
    createdAt: "2026-01-05T10:00:00Z"
  },
  {
    id: "supp-3",
    name: "\u062A\u0648\u0643\u064A\u0644 \u0634\u0646\u0627\u064A\u062F\u0631 \u0625\u0644\u064A\u0643\u062A\u0631\u064A\u0643 \u0645\u0635\u0631 (Schneider Electric)",
    representativeName: "\u0645/ \u062E\u0627\u0644\u062F \u0645\u0631\u0633\u064A",
    phone: "01077788899",
    address: "\u0627\u0644\u062A\u062C\u0645\u0639 \u0627\u0644\u062E\u0627\u0645\u0633 - \u0645\u062C\u0645\u0639 \u0627\u0644\u0634\u0631\u0643\u0627\u062A",
    suppliedCategories: "\u0642\u0648\u0627\u0637\u0639 \u062F\u064A\u062C\u064A\u062A\u0627\u0644\u060C \u0644\u0648\u062D\u0627\u062A\u060C \u0645\u0641\u0627\u062A\u064A\u062D \u0623\u0648\u062A\u0648\u0645\u0627\u062A\u064A\u0643\u060C \u0643\u0648\u0646\u062A\u0627\u0643\u062A\u0648\u0631\u0627\u062A",
    initialBalance: 28e3,
    currentBalance: 28e3,
    notes: "\u0623\u0635\u0646\u0627\u0641 \u0645\u0639\u062A\u0645\u062F\u0629 \u0648\u0645\u0637\u0627\u0628\u0642\u0629 \u0644\u0644\u0645\u0648\u0627\u0635\u0641\u0627\u062A \u0627\u0644\u0642\u064A\u0627\u0633\u064A\u0629 \u0627\u0644\u0639\u0627\u0644\u0645\u064A\u0629",
    createdAt: "2026-01-10T11:00:00Z"
  },
  {
    id: "supp-4",
    name: "\u0645\u0635\u0646\u0639 \u0645\u0635\u0637\u0641\u0649 \u0645\u062D\u0645\u0648\u062F \u0644\u062E\u0631\u0627\u0637\u064A\u0645 \u0648\u0645\u0648\u0627\u0633\u064A\u0631 \u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0621",
    representativeName: "\u0627\u0644\u062D\u0627\u062C \u0631\u0645\u0636\u0627\u0646",
    phone: "01099900011",
    address: "\u0642\u0644\u064A\u0648\u0628 - \u0637\u0631\u064A\u0642 \u0645\u0635\u0631 \u0625\u0633\u0643\u0646\u062F\u0631\u064A\u0629 \u0627\u0644\u0632\u0631\u0627\u0639\u064A",
    suppliedCategories: "\u062E\u0631\u0627\u0637\u064A\u0645 \u0633\u0648\u0633\u062A\u0629\u060C \u0645\u0648\u0627\u0633\u064A\u0631 \u0635\u0644\u0628 \u0648\u0628\u0644\u0627\u0633\u062A\u064A\u0643\u060C \u0639\u0644\u0628 \u0645\u0627\u062C\u064A\u0643",
    initialBalance: 9500,
    currentBalance: 9500,
    notes: "\u062A\u0648\u0631\u064A\u062F \u0623\u0633\u0628\u0648\u0639\u064A \u0644\u0644\u0645\u062E\u0632\u0646",
    createdAt: "2026-01-12T13:00:00Z"
  }
];
var INITIAL_SALES_INVOICES = [
  {
    id: "inv-s-1001",
    invoiceNumber: "INV-2026-1001",
    date: "2026-10-20T10:30:00Z",
    customerId: "cust-1",
    customerName: "\u0627\u0644\u0645\u0642\u0627\u0648\u0644 \u062D\u0633\u0646 \u0627\u0644\u0635\u0627\u0648\u064A (\u0634\u0631\u0643\u0629 \u0627\u0644\u0635\u0627\u0648\u064A \u0644\u0644\u0645\u0642\u0627\u0648\u0644\u0627\u062A \u0648\u0627\u0644\u062F\u064A\u0643\u0648\u0631)",
    customerPhone: "01012345678",
    items: [
      {
        productId: "p-wire-15",
        productName: "\u0633\u0644\u0643 \u0646\u062D\u0627\u0633 \u0645\u0639\u0632\u0648\u0644 1.5 \u0645\u0645 \u0633\u0648\u064A\u062F\u064A \u0623\u0635\u0644\u064A (\u0644\u0641\u0629 100\u0645)",
        category: "wires_cables",
        brand: "\u0627\u0644\u0633\u0648\u064A\u062F\u064A \u0625\u0644\u064A\u0643\u062A\u0631\u064A\u0643",
        unit: "\u0644\u0641\u0629",
        unitPrice: 1150,
        purchaseCost: 950,
        quantity: 5,
        total: 5750
      },
      {
        productId: "p-wire-25",
        productName: "\u0633\u0644\u0643 \u0646\u062D\u0627\u0633 \u0645\u0639\u0632\u0648\u0644 2.5 \u0645\u0645 \u0633\u0648\u064A\u062F\u064A \u0623\u0635\u0644\u064A (\u0644\u0641\u0629 100\u0645)",
        category: "wires_cables",
        brand: "\u0627\u0644\u0633\u0648\u064A\u062F\u064A \u0625\u0644\u064A\u0643\u062A\u0631\u064A\u0643",
        unit: "\u0644\u0641\u0629",
        unitPrice: 1780,
        purchaseCost: 1500,
        quantity: 4,
        total: 7120
      },
      {
        productId: "p-kit-panel-assembled",
        productName: "\u0644\u0648\u062D\u0629 \u062A\u0648\u0632\u064A\u0639 12 \u062E\u0637 \u0645\u062C\u0647\u0632\u0629 \u0648\u062C\u0627\u0647\u0632\u0629 \u0644\u0644\u062A\u0631\u0643\u064A\u0628 (\u0642\u0648\u0627\u0637\u0639 \u0634\u0646\u0627\u064A\u062F\u0631 + \u0628\u0627\u0631\u0627\u062A)",
        category: "breakers_panels",
        brand: "\u062A\u062C\u0645\u064A\u0639 \u0648\u0633\u0627\u0645 \u0644\u0644\u0643\u0647\u0631\u0628\u0627\u0621",
        unit: "\u0637\u0642\u0645",
        unitPrice: 1950,
        purchaseCost: 1420,
        quantity: 2,
        total: 3900
      }
    ],
    subtotal: 16770,
    discount: 270,
    total: 16500,
    paidAmount: 1e4,
    remainingAmount: 6500,
    paymentMethod: "credit",
    safeId: "safe-pos",
    notes: "\u062F\u0641\u0639\u0629 \u0646\u0642\u062F\u064A\u0629 10,000 \u062C.\u0645 \u0648\u0627\u0644\u0628\u0627\u0642\u064A 6,500 \u062C.\u0645 \u0622\u062C\u0644 \u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0642\u0627\u0648\u0644 \u062D\u0633\u0646 \u0627\u0644\u0635\u0627\u0648\u064A",
    status: "completed"
  },
  {
    id: "inv-s-1002",
    invoiceNumber: "INV-2026-1002",
    date: "2026-10-21T16:15:00Z",
    customerId: "cust-2",
    customerName: "\u0627\u0644\u0623\u0633\u0637\u0649 \u0625\u0628\u0631\u0627\u0647\u064A\u0645 \u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0626\u064A (\u0641\u0646\u064A \u062A\u0645\u062F\u064A\u062F\u0627\u062A \u0645\u0646\u0627\u0632\u0644)",
    customerPhone: "01198765432",
    items: [
      {
        productId: "p-sw-venus",
        productName: "\u0644\u0642\u0645\u0629 \u0645\u0641\u062A\u0627\u062D \u0625\u0646\u0627\u0631\u0629 \u0639\u0631\u064A\u0636 16 \u0623\u0645\u0628\u064A\u0631 \u0641\u064A\u0646\u0648\u0633 \u0628\u064A\u062C",
        category: "switches_sockets",
        brand: "\u0641\u064A\u0646\u0648\u0633",
        unit: "\u0642\u0637\u0639\u0629",
        unitPrice: 32,
        purchaseCost: 22,
        quantity: 20,
        total: 640
      },
      {
        productId: "p-sock-schneider",
        productName: "\u0644\u0642\u0645\u0629 \u0628\u0631\u064A\u0632\u0629 \u0645\u0641\u0631\u062F\u0629 \u0634\u0646\u0627\u064A\u062F\u0631 \u0623\u0635\u0644\u064A \u0645\u0639 \u0637\u0631\u0641 \u062A\u0623\u0631\u064A\u0636 16A",
        category: "switches_sockets",
        brand: "\u0634\u0646\u0627\u064A\u062F\u0631 \u0625\u0644\u064A\u0643\u062A\u0631\u064A\u0643",
        unit: "\u0642\u0637\u0639\u0629",
        unitPrice: 42,
        purchaseCost: 28,
        quantity: 25,
        total: 1050
      },
      {
        productId: "p-chassis-magic",
        productName: "\u0634\u0627\u0633\u064A\u0647 \u0645\u0627\u062C\u064A\u0643 \u062D\u062F\u064A\u062F \u0645\u0642\u0648\u0649 \u0641\u064A\u0646\u0648\u0633 \u0645\u0639 \u0645\u0633\u0627\u0645\u064A\u0631 \u0627\u0644\u062A\u062B\u0628\u064A\u062A",
        category: "switches_sockets",
        brand: "\u0641\u064A\u0646\u0648\u0633",
        unit: "\u0642\u0637\u0639\u0629",
        unitPrice: 14,
        purchaseCost: 8,
        quantity: 15,
        total: 210
      },
      {
        productId: "p-tape-isolin",
        productName: "\u0634\u0631\u064A\u0637 \u0644\u062D\u0627\u0645 \u0643\u0647\u0631\u0628\u0627\u0626\u064A \u0625\u064A\u0632\u0648\u0644\u064A\u0646 \u0639\u0627\u0632\u0644 \u0623\u0635\u0644\u064A (\u062F\u0633\u062A\u0629 10 \u0628\u0643\u0631\u0627\u062A)",
        category: "accessories",
        brand: "\u0625\u064A\u0632\u0648\u0644\u064A\u0646 \u0625\u064A\u0637\u0627\u0644\u064A",
        unit: "\u0639\u0644\u0628\u0629",
        unitPrice: 65,
        purchaseCost: 45,
        quantity: 3,
        total: 195
      }
    ],
    subtotal: 2095,
    discount: 95,
    total: 2e3,
    paidAmount: 2e3,
    remainingAmount: 0,
    paymentMethod: "cash",
    safeId: "safe-pos",
    notes: "\u0633\u062F\u0627\u062F \u0646\u0642\u062F\u064A \u0628\u0627\u0644\u0643\u0627\u0645\u0644 \u0641\u064A \u062F\u0631\u062C \u0643\u0627\u0634\u064A\u0631 \u0627\u0644\u0645\u0639\u0631\u0636",
    status: "completed"
  },
  {
    id: "inv-s-1003",
    invoiceNumber: "INV-2026-1003",
    date: "2026-10-22T12:00:00Z",
    customerId: "cust-3",
    customerName: "\u0627\u0644\u0645\u0647\u0646\u062F\u0633 \u0637\u0627\u0631\u0642 \u0639\u0628\u062F \u0627\u0644\u0645\u0646\u0639\u0645 (\u0645\u0627\u0644\u0643 \u0634\u0642\u0629 \u0628\u0631\u062C \u0627\u0644\u0635\u0641\u0648\u0629)",
    customerPhone: "01234567890",
    items: [
      {
        productId: "p-lamp-9w",
        productName: "\u0644\u0645\u0628\u0629 \u0644\u064A\u062F 9 \u0648\u0627\u062A \u0625\u0636\u0627\u0621\u0629 \u0628\u064A\u0636\u0627\u0621 E27 \u062A\u0648\u0634\u064A\u0628\u0627",
        category: "lighting_bulbs",
        brand: "\u062A\u0648\u0634\u064A\u0628\u0627",
        unit: "\u0642\u0637\u0639\u0629",
        unitPrice: 50,
        purchaseCost: 35,
        quantity: 15,
        total: 750
      },
      {
        productId: "p-lamp-12w",
        productName: "\u0644\u0645\u0628\u0629 \u0644\u064A\u062F 12 \u0648\u0627\u062A \u0648\u0631\u0645 (\u0625\u0636\u0627\u0621\u0629 \u062F\u0627\u0641\u0626\u0629) \u0641\u064A\u0644\u064A\u0628\u0633 E27",
        category: "lighting_bulbs",
        brand: "\u0641\u064A\u0644\u064A\u0628\u0633",
        unit: "\u0642\u0637\u0639\u0629",
        unitPrice: 68,
        purchaseCost: 48,
        quantity: 10,
        total: 680
      },
      {
        productId: "p-spot-7w",
        productName: "\u0633\u0628\u0648\u062A \u0644\u0627\u064A\u062A \u0644\u064A\u062F \u0645\u062A\u062D\u0631\u0643 7 \u0648\u0627\u062A COB \u062F\u0627\u064A \u0643\u0627\u0633\u062A \u0645\u0639 \u062F\u0631\u0627\u064A\u0641\u0631",
        category: "lighting_bulbs",
        brand: "\u062A\u0648\u0634\u064A\u0628\u0627 \u0633\u0645\u0627\u0631\u062A",
        unit: "\u0642\u0637\u0639\u0629",
        unitPrice: 65,
        purchaseCost: 45,
        quantity: 8,
        total: 520
      }
    ],
    subtotal: 1950,
    discount: 50,
    total: 1900,
    paidAmount: 1900,
    remainingAmount: 0,
    paymentMethod: "instapay",
    safeId: "safe-instapay",
    notes: "\u062A\u062D\u0648\u064A\u0644 \u0645\u0628\u0627\u0634\u0631 \u0639\u0628\u0631 \u0627\u0646\u0633\u062A\u0627 \u0628\u0627\u064A \u0639\u0644\u0649 \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0624\u0633\u0633\u0629",
    status: "completed"
  }
];
var INITIAL_PURCHASE_INVOICES = [
  {
    id: "inv-p-501",
    invoiceNumber: "PUR-2026-501",
    date: "2026-10-10T09:00:00Z",
    supplierId: "supp-1",
    supplierName: "\u0634\u0631\u0643\u0629 \u0627\u0644\u0633\u0648\u064A\u062F\u064A \u0644\u0644\u0643\u0627\u0628\u0644\u0627\u062A \u0648\u0627\u0644\u0623\u0633\u0644\u0627\u0643 (\u0627\u0644\u062A\u0648\u0643\u064A\u0644 \u0627\u0644\u0631\u0626\u064A\u0633\u064A)",
    items: [
      {
        productId: "p-wire-15",
        productName: "\u0633\u0644\u0643 \u0646\u062D\u0627\u0633 \u0645\u0639\u0632\u0648\u0644 1.5 \u0645\u0645 \u0633\u0648\u064A\u062F\u064A \u0623\u0635\u0644\u064A (\u0644\u0641\u0629 100\u0645)",
        unit: "\u0644\u0641\u0629",
        unitPrice: 950,
        quantity: 30,
        total: 28500
      },
      {
        productId: "p-wire-25",
        productName: "\u0633\u0644\u0643 \u0646\u062D\u0627\u0633 \u0645\u0639\u0632\u0648\u0644 2.5 \u0645\u0645 \u0633\u0648\u064A\u062F\u064A \u0623\u0635\u0644\u064A (\u0644\u0641\u0629 100\u0645)",
        unit: "\u0644\u0641\u0629",
        unitPrice: 1500,
        quantity: 25,
        total: 37500
      },
      {
        productId: "p-wire-40",
        productName: "\u0633\u0644\u0643 \u0646\u062D\u0627\u0633 \u0645\u0639\u0632\u0648\u0644 4 \u0645\u0645 \u0633\u0648\u064A\u062F\u064A \u0623\u0635\u0644\u064A (\u0644\u0641\u0629 100\u0645)",
        unit: "\u0644\u0641\u0629",
        unitPrice: 2400,
        quantity: 15,
        total: 36e3
      }
    ],
    total: 102e3,
    paidAmount: 6e4,
    remainingAmount: 42e3,
    paymentMethod: "transfer",
    safeId: "safe-bank",
    notes: "\u062A\u062D\u0648\u064A\u0644 \u0628\u0646\u0643\u064A 60,000 \u062C.\u0645 \u0645\u0646 \u062D\u0633\u0627\u0628 \u0628\u0646\u0643 \u0645\u0635\u0631\u060C \u0648\u0627\u0644\u0628\u0627\u0642\u064A 42,000 \u062C.\u0645 \u0622\u062C\u0644"
  },
  {
    id: "inv-p-502",
    invoiceNumber: "PUR-2026-502",
    date: "2026-10-14T11:30:00Z",
    supplierId: "supp-2",
    supplierName: "\u0634\u0631\u0643\u0629 \u0641\u064A\u0646\u0648\u0633 \u0644\u0644\u0635\u0646\u0627\u0639\u0627\u062A \u0648\u0627\u0644\u062D\u0644\u0648\u0644 \u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0626\u064A\u0629",
    items: [
      {
        productId: "p-sw-venus",
        productName: "\u0644\u0642\u0645\u0629 \u0645\u0641\u062A\u0627\u062D \u0625\u0646\u0627\u0631\u0629 \u0639\u0631\u064A\u0636 16 \u0623\u0645\u0628\u064A\u0631 \u0641\u064A\u0646\u0648\u0633 \u0628\u064A\u062C",
        unit: "\u0642\u0637\u0639\u0629",
        unitPrice: 22,
        quantity: 200,
        total: 4400
      },
      {
        productId: "p-chassis-magic",
        productName: "\u0634\u0627\u0633\u064A\u0647 \u0645\u0627\u062C\u064A\u0643 \u062D\u062F\u064A\u062F \u0645\u0642\u0648\u0649 \u0641\u064A\u0646\u0648\u0633 \u0645\u0639 \u0645\u0633\u0627\u0645\u064A\u0631 \u0627\u0644\u062A\u062B\u0628\u064A\u062A",
        unit: "\u0642\u0637\u0639\u0629",
        unitPrice: 8,
        quantity: 300,
        total: 2400
      },
      {
        productId: "p-lamp-9w",
        productName: "\u0644\u0645\u0628\u0629 \u0644\u064A\u062F 9 \u0648\u0627\u062A \u0625\u0636\u0627\u0621\u0629 \u0628\u064A\u0636\u0627\u0621 E27 \u062A\u0648\u0634\u064A\u0628\u0627",
        unit: "\u0642\u0637\u0639\u0629",
        unitPrice: 35,
        quantity: 150,
        total: 5250
      },
      {
        productId: "p-panel-12line",
        productName: "\u0644\u0648\u062D\u0629 \u0642\u0648\u0627\u0637\u0639 \u062A\u0648\u0632\u064A\u0639 \u063A\u0627\u0637\u0633 12 \u062E\u0637 \u0641\u064A\u0646\u0648\u0633 \u0628\u0627\u0628 \u0634\u0641\u0627\u0641 \u0645\u0639 \u0628\u0627\u0631\u0627\u062A \u0646\u062D\u0627\u0633",
        unit: "\u0642\u0637\u0639\u0629",
        unitPrice: 190,
        quantity: 30,
        total: 5700
      }
    ],
    total: 17750,
    paidAmount: 17750,
    remainingAmount: 0,
    paymentMethod: "cash",
    safeId: "safe-main",
    notes: "\u0633\u062F\u0627\u062F \u0646\u0642\u062F\u064A \u0641\u0648\u0631\u064A \u0628\u0627\u0644\u0643\u0627\u0645\u0644 \u0645\u0646 \u0627\u0644\u062E\u0632\u064A\u0646\u0629 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629"
  }
];
var INITIAL_EXPENSES = [
  {
    id: "exp-1",
    title: "\u0625\u064A\u062C\u0627\u0631 \u0645\u0642\u0631 \u0627\u0644\u0645\u0639\u0631\u0636 \u0648\u0627\u0644\u0645\u062E\u0632\u0646 \u0627\u0644\u0631\u0626\u064A\u0633\u064A \u0644\u0634\u0647\u0631 \u0623\u0643\u062A\u0648\u0628\u0631",
    category: "rent",
    amount: 12e3,
    safeId: "safe-main",
    date: "2026-10-01T10:00:00Z",
    recipient: "\u0627\u0644\u062D\u0627\u062C \u0641\u0648\u0632\u064A (\u0645\u0627\u0644\u0643 \u0627\u0644\u0639\u0642\u0627\u0631)",
    notes: "\u0625\u064A\u0635\u0627\u0644 \u0625\u064A\u062C\u0627\u0631 \u0631\u0633\u0645\u064A \u0634\u0647\u0631 \u0623\u0643\u062A\u0648\u0628\u0631 2026"
  },
  {
    id: "exp-2",
    title: "\u0641\u0627\u062A\u0648\u0631\u0629 \u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0621 \u0648\u0627\u0644\u0625\u0646\u062A\u0631\u0646\u062A \u0644\u0644\u0645\u062D\u0644 \u0648\u0627\u0644\u0645\u062E\u0632\u0646",
    category: "utilities",
    amount: 1450,
    safeId: "safe-pos",
    date: "2026-10-05T12:00:00Z",
    recipient: "\u0634\u0631\u0643\u0629 \u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0621 \u0648 WE",
    notes: "\u0641\u0627\u062A\u0648\u0631\u0629 \u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0621 \u0627\u0644\u062A\u062C\u0627\u0631\u064A\u0629 \u0648\u0627\u0644\u0625\u0646\u062A\u0631\u0646\u062A \u0641\u0627\u064A\u0628\u0631"
  },
  {
    id: "exp-3",
    title: "\u0646\u0648\u0644\u0648\u0646 \u0648\u0645\u0634\u0627\u0644 \u062A\u0641\u0631\u064A\u063A \u0634\u062D\u0646\u0629 \u0643\u0627\u0628\u0644\u0627\u062A \u0627\u0644\u0633\u0648\u064A\u062F\u064A",
    category: "transport",
    amount: 850,
    safeId: "safe-pos",
    date: "2026-10-10T14:00:00Z",
    recipient: "\u0639\u0645\u0627\u0644 \u0627\u0644\u0645\u0634\u0627\u0644 \u0648\u0633\u0627\u0626\u0642 \u0627\u0644\u0634\u0627\u062D\u0646\u0629",
    notes: "\u062A\u0641\u0631\u064A\u063A \u0648\u062A\u0639\u062A\u064A\u0642 \u0644\u0641\u0627\u062A \u0627\u0644\u0623\u0633\u0644\u0627\u0643 \u062F\u0627\u062E\u0644 \u0645\u0633\u062A\u0648\u062F\u0639 \u0627\u0644\u0633\u0628\u062A\u064A\u0629"
  },
  {
    id: "exp-4",
    title: "\u0636\u064A\u0627\u0641\u0629 \u0648\u0628\u0648\u0641\u064A\u0647 \u0648\u0645\u0633\u062A\u0644\u0632\u0645\u0627\u062A \u0646\u0638\u0627\u0641\u0629 \u0627\u0644\u0645\u0639\u0631\u0636",
    category: "hospitality",
    amount: 420,
    safeId: "safe-pos",
    date: "2026-10-18T16:00:00Z",
    recipient: "\u0628\u0648\u0641\u064A\u0647 \u0627\u0644\u0645\u0639\u0631\u0636",
    notes: "\u0634\u0627\u064A \u0648\u0642\u0647\u0648\u0629 \u0648\u0636\u064A\u0627\u0641\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0648\u0627\u0644\u0645\u0642\u0627\u0648\u0644\u064A\u0646"
  }
];
var INITIAL_TRANSACTIONS = [
  {
    id: "tx-1",
    type: "capital_deposit",
    title: "\u0625\u064A\u062F\u0627\u0639 \u0631\u0635\u064A\u062F \u0627\u0641\u062A\u062A\u0627\u062D\u064A \u0641\u064A \u0627\u0644\u062E\u0632\u064A\u0646\u0629 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629",
    amount: 5e4,
    direction: "in",
    safeId: "safe-main",
    date: "2026-10-01T08:00:00Z",
    notes: "\u0627\u0641\u062A\u062A\u0627\u062D \u0627\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0627\u0644\u064A \u0644\u0644\u0645\u0624\u0633\u0633\u0629"
  },
  {
    id: "tx-2",
    type: "capital_deposit",
    title: "\u0625\u064A\u062F\u0627\u0639 \u0631\u0635\u064A\u062F \u062A\u0634\u063A\u064A\u0644\u064A \u0641\u064A \u062D\u0633\u0627\u0628 \u0628\u0646\u0643 \u0645\u0635\u0631",
    amount: 15e4,
    direction: "in",
    safeId: "safe-bank",
    date: "2026-10-01T08:30:00Z",
    notes: "\u0631\u0623\u0633 \u0645\u0627\u0644 \u0627\u0644\u0628\u0646\u0643 \u0644\u0644\u062A\u062D\u0648\u064A\u0644\u0627\u062A \u0648\u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F\u0627\u062A"
  },
  {
    id: "tx-3",
    type: "safe_transfer",
    title: "\u062A\u062D\u0648\u064A\u0644 \u0639\u0647\u062F\u0629 \u0646\u0642\u062F\u064A\u0629 \u0645\u0646 \u0627\u0644\u062E\u0632\u064A\u0646\u0629 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629 \u0625\u0644\u0649 \u062F\u0631\u062C \u0627\u0644\u0643\u0627\u0634\u064A\u0631",
    amount: 1e4,
    direction: "out",
    safeId: "safe-main",
    date: "2026-10-01T09:00:00Z",
    notes: "\u0633\u062D\u0628 10,000 \u062C.\u0645 \u0644\u062A\u063A\u0630\u064A\u0629 \u062F\u0631\u062C \u0627\u0644\u0643\u0627\u0634\u064A\u0631 \u0643\u0646\u0642\u062F\u064A\u0629 \u0641\u0643\u0629 \u0648\u0628\u062F\u0627\u064A\u0629 \u0645\u0628\u064A\u0639\u0627\u062A"
  },
  {
    id: "tx-4",
    type: "safe_transfer",
    title: "\u0627\u0633\u062A\u0644\u0627\u0645 \u0639\u0647\u062F\u0629 \u0646\u0642\u062F\u064A\u0629 \u0645\u0646 \u0627\u0644\u062E\u0632\u064A\u0646\u0629 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629 \u0644\u062F\u0631\u062C \u0627\u0644\u0643\u0627\u0634\u064A\u0631",
    amount: 1e4,
    direction: "in",
    safeId: "safe-pos",
    date: "2026-10-01T09:05:00Z",
    notes: "\u0627\u0633\u062A\u0644\u0627\u0645 \u0639\u0647\u062F\u0629 \u0646\u0642\u062F\u064A\u0629"
  },
  {
    id: "tx-5",
    type: "debt_collection",
    title: "\u062A\u062D\u0635\u064A\u0644 \u062F\u0641\u0639\u0629 \u0646\u0642\u062F\u064A\u0629 \u0645\u0646 \u062D\u0633\u0627\u0628 \u0627\u0644\u0645\u0642\u0627\u0648\u0644 \u062D\u0633\u0646 \u0627\u0644\u0635\u0627\u0648\u064A",
    amount: 1e4,
    direction: "in",
    safeId: "safe-pos",
    partyType: "customer",
    partyId: "cust-1",
    partyName: "\u0627\u0644\u0645\u0642\u0627\u0648\u0644 \u062D\u0633\u0646 \u0627\u0644\u0635\u0627\u0648\u064A",
    date: "2026-10-20T10:35:00Z",
    referenceId: "inv-s-1001",
    notes: "\u062F\u0641\u0639\u0629 \u0646\u0642\u062F\u064A\u0629 \u0645\u0642\u0628\u0648\u0636\u0629 \u0628\u0645\u0648\u062C\u0628 \u0641\u0627\u062A\u0648\u0631\u0629 INV-2026-1001"
  },
  {
    id: "tx-6",
    type: "sale_income",
    title: "\u062A\u062D\u0635\u064A\u0644 \u0645\u0628\u064A\u0639\u0627\u062A \u0646\u0642\u062F\u064A\u0629 \u0641\u0627\u062A\u0648\u0631\u0629 INV-2026-1002 (\u0627\u0644\u0623\u0633\u0637\u0649 \u0625\u0628\u0631\u0627\u0647\u064A\u0645)",
    amount: 2e3,
    direction: "in",
    safeId: "safe-pos",
    date: "2026-10-21T16:15:00Z",
    referenceId: "inv-s-1002",
    notes: "\u0645\u0628\u064A\u0639\u0627\u062A \u0646\u0642\u062F\u064A\u0629 \u0641\u0648\u0631\u064A\u0629"
  },
  {
    id: "tx-7",
    type: "sale_income",
    title: "\u0625\u064A\u062F\u0627\u0639 \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0627\u0646\u0633\u062A\u0627 \u0628\u0627\u064A \u0641\u0627\u062A\u0648\u0631\u0629 INV-2026-1003 (\u0645/ \u0637\u0627\u0631\u0642)",
    amount: 1900,
    direction: "in",
    safeId: "safe-instapay",
    date: "2026-10-22T12:00:00Z",
    referenceId: "inv-s-1003",
    notes: "\u062A\u062D\u0648\u064A\u0644 \u0627\u0646\u0633\u062A\u0627 \u0628\u0627\u064A"
  },
  {
    id: "tx-8",
    type: "general_expense",
    title: "\u0633\u062F\u0627\u062F \u0625\u064A\u062C\u0627\u0631 \u0645\u0642\u0631 \u0627\u0644\u0645\u0639\u0631\u0636 \u0648\u0627\u0644\u0645\u062E\u0632\u0646",
    amount: 12e3,
    direction: "out",
    safeId: "safe-main",
    date: "2026-10-01T10:00:00Z",
    notes: "\u0645\u0635\u0631\u0648\u0641 \u0625\u064A\u062C\u0627\u0631"
  }
];
var INITIAL_ASSOCIATIONS = [
  {
    id: "assoc-1",
    name: "\u062C\u0645\u0639\u064A\u0629 \u0627\u0644\u062A\u062C\u0627\u0631 \u0648\u0627\u0644\u0634\u0631\u0643\u0627\u0621 \u0627\u0644\u0633\u0646\u0648\u064A\u0629",
    organizer: "\u0627\u0644\u062D\u0627\u062C \u0625\u0628\u0631\u0627\u0647\u064A\u0645 \u0627\u0644\u0639\u0648\u0636\u064A",
    totalAmount: 1e5,
    monthlyInstallment: 1e4,
    totalMonths: 10,
    paidMonths: 4,
    payoutTurnMonth: 7,
    payoutDate: "2026-07-01",
    status: "active",
    safeId: "safe-main",
    startDate: "2026-01-01",
    notes: "\u062C\u0645\u0639\u064A\u0629 \u0627\u062F\u062E\u0627\u0631\u064A\u0629 \u0644\u0634\u0631\u0627\u0621 \u0628\u0636\u0627\u0626\u0639 \u0627\u0644\u0635\u064A\u0641 \u0643\u0627\u0628\u0644\u0627\u062A \u0648\u0645\u0641\u0627\u062A\u064A\u062D"
  },
  {
    id: "assoc-2",
    name: "\u062C\u0645\u0639\u064A\u0629 \u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u0627\u0644\u0631\u0645\u0636\u0627\u0646\u064A\u0629",
    organizer: "\u0627\u0644\u0645\u0647\u0646\u062F\u0633 \u0637\u0627\u0631\u0642 \u0639\u0628\u062F \u0627\u0644\u0645\u0646\u0639\u0645",
    totalAmount: 3e4,
    monthlyInstallment: 3e3,
    totalMonths: 10,
    paidMonths: 8,
    payoutTurnMonth: 3,
    payoutDate: "2026-03-01",
    status: "payout_received",
    safeId: "safe-main",
    startDate: "2025-06-01",
    notes: "\u062A\u0645 \u0642\u0628\u0636 \u0627\u0644\u062C\u0645\u0639\u064A\u0629 \u0628\u0627\u0644\u0643\u0627\u0645\u0644 \u0648\u0625\u064A\u062F\u0627\u0639\u0647\u0627 \u0628\u062E\u0632\u064A\u0646\u0629 \u0627\u0644\u0645\u0639\u0631\u0636"
  }
];

// server.ts
dotenv.config();
var sql = null;
try {
  const mssqlModule = await import("mssql");
  sql = mssqlModule.default || mssqlModule;
} catch (e) {
  console.warn("Notice: Optional mssql driver could not be loaded:", e?.message);
}
var mysql = null;
try {
  const mysqlModule = await import("mysql2/promise");
  mysql = mysqlModule.default || mysqlModule;
} catch (e) {
  console.warn("Notice: Optional mysql2 driver could not be loaded:", e?.message);
}
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = process.env.PORT || 3e3;
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
var SERVER_DB_FILE = path.join(__dirname, "data", "server_database.json");
function getDefaultServerDb() {
  return {
    products: INITIAL_PRODUCTS || [],
    customers: INITIAL_CUSTOMERS || [],
    suppliers: INITIAL_SUPPLIERS || [],
    salesInvoices: INITIAL_SALES_INVOICES || [],
    purchaseInvoices: INITIAL_PURCHASE_INVOICES || [],
    salesReturns: [],
    purchaseReturns: [],
    expenses: INITIAL_EXPENSES || [],
    transactions: INITIAL_TRANSACTIONS || [],
    settings: INITIAL_SETTINGS || {},
    users: INITIAL_USERS || [],
    safes: INITIAL_SAFES || [],
    safeTransfers: [],
    recipes: INITIAL_RECIPES || [],
    assemblyOperations: INITIAL_ASSEMBLY_OPERATIONS || [],
    associations: INITIAL_ASSOCIATIONS || [],
    savedAudits: [],
    previouslyAuditedMap: {},
    shifts: [],
    wasteRecords: []
  };
}
function loadServerDatabase() {
  try {
    const dir = path.dirname(SERVER_DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(SERVER_DB_FILE)) {
      const initial = getDefaultServerDb();
      fs.writeFileSync(SERVER_DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
      return initial;
    }
    const content = fs.readFileSync(SERVER_DB_FILE, "utf-8");
    const parsed = JSON.parse(content);
    return { ...getDefaultServerDb(), ...parsed };
  } catch (err) {
    console.error("Failed to load server database file:", err);
    return getDefaultServerDb();
  }
}
function saveServerDatabase(data) {
  try {
    const dir = path.dirname(SERVER_DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const current = loadServerDatabase();
    const updated = { ...current, ...data };
    fs.writeFileSync(SERVER_DB_FILE, JSON.stringify(updated, null, 2), "utf-8");
    return updated;
  } catch (err) {
    console.error("Failed to save server database file:", err);
    return null;
  }
}
app.get(["/api/database", "/api/get_all.php"], (req, res) => {
  const data = loadServerDatabase();
  res.json({ success: true, data });
});
app.post(["/api/database/save", "/api/save_all.php"], (req, res) => {
  try {
    const payload = req.body.data || req.body;
    const saved = saveServerDatabase(payload);
    res.json({ success: true, message: "\u062A\u0645 \u062D\u0641\u0638 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0646\u062C\u0627\u062D", data: saved });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});
app.post("/api/database/reset", (req, res) => {
  try {
    const initial = getDefaultServerDb();
    const dir = path.dirname(SERVER_DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SERVER_DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
    res.json({ success: true, message: "\u062A\u0645 \u0625\u0639\u0627\u062F\u0629 \u0636\u0628\u0637 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0625\u0644\u0649 \u0627\u0644\u062D\u0627\u0644\u0627\u062A \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629 \u0628\u0646\u062C\u0627\u062D", data: initial });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});
var ENTITY_FILE_MAP = {
  "products.php": "products",
  "customers.php": "customers",
  "suppliers.php": "suppliers",
  "sales.php": "salesInvoices",
  "purchases.php": "purchaseInvoices",
  "sales_returns.php": "salesReturns",
  "purchase_returns.php": "purchaseReturns",
  "expenses.php": "expenses",
  "transactions.php": "transactions",
  "users.php": "users",
  "shifts.php": "shifts",
  "waste.php": "wasteRecords",
  "safes.php": "safes",
  "recipes.php": "recipes",
  "assembly_ops.php": "assemblyOperations",
  "associations.php": "associations",
  "settings.php": "settings"
};
app.all("/api/:endpoint", (req, res, next) => {
  const endpoint = req.params.endpoint;
  const collectionKey = ENTITY_FILE_MAP[endpoint];
  if (!collectionKey) {
    return next();
  }
  const method = req.method;
  const db = loadServerDatabase();
  if (method === "GET") {
    return res.json({ success: true, data: db[collectionKey] || [] });
  }
  if (method === "POST" || method === "PUT") {
    const item = req.body;
    if (collectionKey === "settings") {
      db.settings = { ...db.settings, ...item };
    } else if (item && item.id) {
      const list = Array.isArray(db[collectionKey]) ? db[collectionKey] : [];
      const idx = list.findIndex((x) => x.id === item.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...item };
      } else {
        list.unshift(item);
      }
      db[collectionKey] = list;
    }
    saveServerDatabase(db);
    return res.json({ success: true, message: "\u062A\u0645 \u062D\u0641\u0638 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0646\u062C\u0627\u062D", data: db[collectionKey] });
  }
  if (method === "DELETE") {
    const id = req.query.id || req.body && req.body.id;
    if (id && Array.isArray(db[collectionKey])) {
      db[collectionKey] = db[collectionKey].filter((x) => x.id !== id);
      saveServerDatabase(db);
    }
    return res.json({ success: true, message: "\u062A\u0645 \u0627\u0644\u062D\u0630\u0641 \u0628\u0646\u062C\u0627\u062D", data: db[collectionKey] });
  }
  return next();
});
var CONFIG_FILE = path.join(__dirname, ".sqlserver.config.json");
var defaultSqlConfig = {
  server: process.env.MSSQL_SERVER || "localhost",
  port: Number(process.env.MSSQL_PORT) || 1433,
  user: process.env.MSSQL_USER || "sa",
  password: process.env.MSSQL_PASSWORD || "123456",
  database: process.env.MSSQL_DATABASE || "FrozenHouseDB",
  instanceName: process.env.MSSQL_INSTANCE || "",
  encrypt: false,
  // Recommended false for SQL Server 2012 local installations
  trustServerCertificate: true
};
function getActiveConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = fs.readFileSync(CONFIG_FILE, "utf-8");
      return { ...defaultSqlConfig, ...JSON.parse(data) };
    } catch (e) {
      console.warn("Could not read .sqlserver.config.json, using defaults", e);
    }
  }
  return { ...defaultSqlConfig };
}
function saveActiveConfig(config) {
  const merged = { ...getActiveConfig(), ...config };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), "utf-8");
  return merged;
}
function getMssqlPoolConfig(custom) {
  const current = custom ? { ...getActiveConfig(), ...custom } : getActiveConfig();
  const mssqlConfig = {
    server: current.server,
    port: current.port || 1433,
    user: current.user,
    password: current.password,
    database: current.database || "master",
    options: {
      encrypt: current.encrypt,
      trustServerCertificate: current.trustServerCertificate,
      enableArithAbort: true,
      connectTimeout: 8e3,
      requestTimeout: 15e3
    }
  };
  if (current.instanceName && current.instanceName.trim().length > 0) {
    mssqlConfig.options = {
      ...mssqlConfig.options,
      instanceName: current.instanceName.trim()
    };
  }
  return mssqlConfig;
}
app.get("/api/sqlserver/config", (req, res) => {
  const config = getActiveConfig();
  res.json({
    success: true,
    config: {
      ...config,
      password: config.password ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : "",
      hasPassword: Boolean(config.password)
    }
  });
});
app.post("/api/sqlserver/config", (req, res) => {
  try {
    const { server, port, user, password, database, instanceName, encrypt, trustServerCertificate } = req.body;
    const updateObj = {
      server,
      port: Number(port) || 1433,
      user,
      database,
      instanceName: instanceName || "",
      encrypt: Boolean(encrypt),
      trustServerCertificate: Boolean(trustServerCertificate)
    };
    if (password && password !== "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022") {
      updateObj.password = password;
    }
    const saved = saveActiveConfig(updateObj);
    res.json({
      success: true,
      message: "\u062A\u0645 \u062D\u0641\u0638 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0633\u064A\u0643\u0648\u0644 \u0633\u064A\u0631\u0641\u0631 2012 \u0628\u0646\u062C\u0627\u062D",
      config: {
        ...saved,
        password: saved.password ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : "",
        hasPassword: Boolean(saved.password)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
app.post("/api/sqlserver/test", async (req, res) => {
  const customConfig = req.body.config ? { ...req.body.config } : void 0;
  if (customConfig && customConfig.password === "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022") {
    customConfig.password = getActiveConfig().password;
  }
  const poolConfig = getMssqlPoolConfig(customConfig);
  let pool = null;
  const startTime = Date.now();
  try {
    pool = await new sql.ConnectionPool(poolConfig).connect();
    const result = await pool.request().query(`
      SELECT 
        @@VERSION AS version,
        DB_NAME() AS currentDb,
        SERVERPROPERTY('ProductVersion') AS productVersion,
        SERVERPROPERTY('ProductLevel') AS productLevel,
        SERVERPROPERTY('Edition') AS edition,
        SERVERPROPERTY('MachineName') AS machineName,
        GETDATE() AS serverTime
    `);
    const latency = Date.now() - startTime;
    const row = result.recordset[0];
    await pool.close();
    res.json({
      success: true,
      message: "\u062A\u0645 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0646\u062C\u0627\u062D \u0628\u0642\u0627\u0639\u062F\u0629 \u0628\u064A\u0627\u0646\u0627\u062A SQL Server 2012!",
      latencyMs: latency,
      serverInfo: {
        fullVersion: row.version,
        productVersion: row.productVersion,
        productLevel: row.productLevel,
        edition: row.edition,
        machineName: row.machineName,
        currentDatabase: row.currentDb,
        serverTime: row.serverTime
      }
    });
  } catch (err) {
    if (pool) {
      try {
        await pool.close();
      } catch {
      }
    }
    let arabicHint = "\u062A\u0623\u0643\u062F \u0645\u0646 \u0635\u062D\u0629 \u0627\u0633\u0645 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631";
    if (err.code === "ESOCKET" || err.message?.includes("Failed to connect") || err.message?.includes("timeout")) {
      arabicHint = "\u062A\u0639\u0630\u0631 \u0627\u0644\u0648\u0635\u0648\u0644 \u0644\u0645\u0646\u0641\u0630 SQL Server (1433). \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u062A\u0634\u063A\u064A\u0644 \u062E\u062F\u0645\u0629 SQL Server \u0648\u062E\u062F\u0645\u0629 SQL Server Browser \u0648\u062A\u0641\u0639\u064A\u0644 \u0628\u0631\u0648\u062A\u0648\u0643\u0648\u0644 TCP/IP \u0641\u064A SQL Server Configuration Manager.";
    } else if (err.message?.includes("Login failed")) {
      arabicHint = "\u0641\u0634\u0644 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645. \u062A\u0623\u0643\u062F \u0645\u0646 \u062A\u0641\u0639\u064A\u0644 Mixed Mode Authentication (SQL Server and Windows Authentication) \u0641\u064A \u0633\u064A\u0643\u0648\u0644 \u0633\u064A\u0631\u0641\u0631 \u0648\u0645\u0646 \u0635\u062D\u0629 \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 sa.";
    } else if (err.message?.includes("Cannot open database")) {
      arabicHint = `\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A '${poolConfig.database}' \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629 \u0628\u0639\u062F. \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0636\u063A\u0637 \u0639\u0644\u0649 \u0632\u0631 "\u062A\u0647\u064A\u0626\u0629 \u0648\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062C\u062F\u0627\u0648\u0644 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B" \u0644\u0625\u0646\u0634\u0627\u0626\u0647\u0627 \u0641\u0648\u0631\u0627\u064B.`;
    }
    res.status(400).json({
      success: false,
      error: err.message,
      code: err.code,
      hint: arabicHint
    });
  }
});
app.post("/api/sqlserver/init-db", async (req, res) => {
  const schemaPath = path.join(__dirname, "src", "data", "sqlserver2012_schema.sql");
  if (!fs.existsSync(schemaPath)) {
    return res.status(404).json({ success: false, error: "\u0645\u0644\u0641 \u0633\u0643\u0631\u0628\u062A SQL Server \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  }
  const rawScript = fs.readFileSync(schemaPath, "utf-8");
  const targetDbName = getActiveConfig().database || "FrozenHouseDB";
  const masterConfig = getMssqlPoolConfig({ database: "master" });
  let pool = null;
  try {
    pool = await new sql.ConnectionPool(masterConfig).connect();
    await pool.request().query(`
      IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'${targetDbName}')
      BEGIN
        CREATE DATABASE [${targetDbName}] COLLATE Arabic_100_CI_AS;
      END
    `);
    await pool.close();
    const dbConfig = getMssqlPoolConfig({ database: targetDbName });
    pool = await new sql.ConnectionPool(dbConfig).connect();
    const batches = rawScript.split(/\r?\n\s*GO\s*\r?\n/i).map((b) => b.trim()).filter((b) => b.length > 0 && !b.startsWith("USE master;") && !b.startsWith("USE [MahsoulyDB];") && !b.startsWith("USE [FrozenHouseDB];"));
    for (const batch of batches) {
      if (batch.trim()) {
        await pool.request().query(batch);
      }
    }
    await pool.close();
    res.json({
      success: true,
      message: `\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0648\u062A\u0647\u064A\u0626\u0629 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A [${targetDbName}] \u0648\u0643\u0627\u0641\u0629 \u0627\u0644\u062C\u062F\u0627\u0648\u0644 \u0648\u0627\u0644\u0645\u0646\u0627\u0638\u0631 \u0627\u0644\u0630\u0643\u064A\u0629 \u0628\u0646\u062C\u0627\u062D \u0639\u0644\u0649 SQL Server 2012!`
    });
  } catch (err) {
    if (pool) {
      try {
        await pool.close();
      } catch {
      }
    }
    res.status(500).json({
      success: false,
      error: err.message,
      hint: "\u062A\u0623\u0643\u062F \u0645\u0646 \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0645\u0633\u062A\u062E\u062F\u0645 sa \u0648\u0642\u062F\u0631\u062A\u0647 \u0639\u0644\u0649 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062C\u062F\u0627\u0648\u0644 (CREATE TABLE/CREATE VIEW)."
    });
  }
});
app.get("/api/sqlserver/script", (req, res) => {
  const schemaPath = path.join(__dirname, "src", "data", "sqlserver2012_schema.sql");
  if (fs.existsSync(schemaPath)) {
    const script = fs.readFileSync(schemaPath, "utf-8");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    if (req.query.download === "true") {
      res.setHeader("Content-Disposition", 'attachment; filename="FrozenHouse_SQLServer2012.sql"');
    }
    return res.send(script);
  }
  res.status(404).send("Script not found");
});
app.post("/api/sqlserver/sync/push", async (req, res) => {
  const { products, customers, suppliers, salesInvoices, purchaseInvoices, expenses, transactions, settings } = req.body;
  const targetDb = getActiveConfig().database || "FrozenHouseDB";
  const poolConfig = getMssqlPoolConfig({ database: targetDb });
  let pool = null;
  try {
    pool = await new sql.ConnectionPool(poolConfig).connect();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      if (settings) {
        const reqSetting = new sql.Request(transaction);
        await reqSetting.query(`
          IF EXISTS (SELECT 1 FROM [dbo].[StoreSettings])
            UPDATE [dbo].[StoreSettings] SET 
              [StoreName] = N'${(settings.storeName || "").replace(/'/g, "''")}',
              [OwnerName] = N'${(settings.ownerName || "").replace(/'/g, "''")}',
              [Phone] = N'${(settings.phone || "").replace(/'/g, "''")}',
              [PhoneAlt] = N'${(settings.phoneAlt || "").replace(/'/g, "''")}',
              [Address] = N'${(settings.address || "").replace(/'/g, "''")}',
              [CommercialRecord] = N'${(settings.commercialRecord || "").replace(/'/g, "''")}',
              [AgriculturalLicense] = N'${(settings.agriculturalLicense || "").replace(/'/g, "''")}',
              [InvoiceFooterNote] = N'${(settings.invoiceFooterNote || "").replace(/'/g, "''")}',
              [Currency] = N'${(settings.currency || "\u062C.\u0645").replace(/'/g, "''")}',
              [UpdatedAt] = GETDATE()
          ELSE
            INSERT INTO [dbo].[StoreSettings] ([StoreName], [OwnerName], [Phone], [PhoneAlt], [Address], [CommercialRecord], [AgriculturalLicense], [InvoiceFooterNote], [Currency])
            VALUES (
              N'${(settings.storeName || "").replace(/'/g, "''")}',
              N'${(settings.ownerName || "").replace(/'/g, "''")}',
              N'${(settings.phone || "").replace(/'/g, "''")}',
              N'${(settings.phoneAlt || "").replace(/'/g, "''")}',
              N'${(settings.address || "").replace(/'/g, "''")}',
              N'${(settings.commercialRecord || "").replace(/'/g, "''")}',
              N'${(settings.agriculturalLicense || "").replace(/'/g, "''")}',
              N'${(settings.invoiceFooterNote || "").replace(/'/g, "''")}',
              N'${(settings.currency || "\u062C.\u0645").replace(/'/g, "''")}'
            )
        `);
      }
      if (Array.isArray(suppliers)) {
        for (const s of suppliers) {
          const reqSup = new sql.Request(transaction);
          await reqSup.query(`
            IF EXISTS (SELECT 1 FROM [dbo].[Suppliers] WHERE [Id] = N'${s.id}')
              UPDATE [dbo].[Suppliers] SET
                [Name] = N'${(s.name || "").replace(/'/g, "''")}',
                [RepresentativeName] = N'${(s.representativeName || "").replace(/'/g, "''")}',
                [Phone] = N'${(s.phone || "").replace(/'/g, "''")}',
                [Address] = N'${(s.address || "").replace(/'/g, "''")}',
                [CurrentBalance] = ${Number(s.currentBalance) || 0},
                [Notes] = N'${(s.notes || "").replace(/'/g, "''")}'
              WHERE [Id] = N'${s.id}'
            ELSE
              INSERT INTO [dbo].[Suppliers] ([Id], [Name], [RepresentativeName], [Phone], [Address], [CurrentBalance], [Notes])
              VALUES (
                N'${s.id}',
                N'${(s.name || "").replace(/'/g, "''")}',
                N'${(s.representativeName || "").replace(/'/g, "''")}',
                N'${(s.phone || "").replace(/'/g, "''")}',
                N'${(s.address || "").replace(/'/g, "''")}',
                ${Number(s.currentBalance) || 0},
                N'${(s.notes || "").replace(/'/g, "''")}'
              )
          `);
        }
      }
      if (Array.isArray(customers)) {
        for (const c of customers) {
          const reqCust = new sql.Request(transaction);
          await reqCust.query(`
            IF EXISTS (SELECT 1 FROM [dbo].[Customers] WHERE [Id] = N'${c.id}')
              UPDATE [dbo].[Customers] SET
                [Name] = N'${(c.name || "").replace(/'/g, "''")}',
                [Phone] = N'${(c.phone || "").replace(/'/g, "''")}',
                [Address] = N'${(c.address || "").replace(/'/g, "''")}',
                [CropTypes] = N'${(c.cropTypes || "").replace(/'/g, "''")}',
                [FarmArea] = N'${(c.farmArea || "").replace(/'/g, "''")}',
                [CurrentBalance] = ${Number(c.currentBalance) || 0},
                [Notes] = N'${(c.notes || "").replace(/'/g, "''")}'
              WHERE [Id] = N'${c.id}'
            ELSE
              INSERT INTO [dbo].[Customers] ([Id], [Name], [Phone], [Address], [CropTypes], [FarmArea], [CurrentBalance], [Notes])
              VALUES (
                N'${c.id}',
                N'${(c.name || "").replace(/'/g, "''")}',
                N'${(c.phone || "").replace(/'/g, "''")}',
                N'${(c.address || "").replace(/'/g, "''")}',
                N'${(c.cropTypes || "").replace(/'/g, "''")}',
                N'${(c.farmArea || "").replace(/'/g, "''")}',
                ${Number(c.currentBalance) || 0},
                N'${(c.notes || "").replace(/'/g, "''")}'
              )
          `);
        }
      }
      if (Array.isArray(products)) {
        for (const p of products) {
          const reqProd = new sql.Request(transaction);
          const expSql = p.expiryDate ? `'${p.expiryDate}'` : "NULL";
          await reqProd.query(`
            IF EXISTS (SELECT 1 FROM [dbo].[Products] WHERE [Id] = N'${p.id}')
              UPDATE [dbo].[Products] SET
                [Name] = N'${(p.name || "").replace(/'/g, "''")}',
                [Category] = N'${(p.category || "").replace(/'/g, "''")}',
                [ActiveIngredient] = N'${(p.activeIngredient || "").replace(/'/g, "''")}',
                [Concentration] = N'${(p.concentration || "").replace(/'/g, "''")}',
                [Phi] = ${p.phi !== void 0 && p.phi !== null ? Number(p.phi) : "NULL"},
                [DosageInfo] = N'${(p.dosageInfo || "").replace(/'/g, "''")}',
                [TargetPests] = N'${(p.targetPests || "").replace(/'/g, "''")}',
                [Toxicity] = N'${(p.toxicity || "caution").replace(/'/g, "''")}',
                [Barcode] = N'${(p.barcode || "").replace(/'/g, "''")}',
                [Unit] = N'${(p.unit || "").replace(/'/g, "''")}',
                [PurchasePrice] = ${Number(p.purchasePrice) || 0},
                [SellingPrice] = ${Number(p.sellingPrice) || 0},
                [Quantity] = ${Number(p.quantity) || 0},
                [MinAlertQuantity] = ${Number(p.minAlertQuantity) || 5},
                [BatchNumber] = N'${(p.batchNumber || "").replace(/'/g, "''")}',
                [ExpiryDate] = ${expSql},
                [SupplierId] = ${p.supplierId ? `N'${p.supplierId}'` : "NULL"},
                [Notes] = N'${(p.notes || "").replace(/'/g, "''")}'
              WHERE [Id] = N'${p.id}'
            ELSE
              INSERT INTO [dbo].[Products] ([Id], [Name], [Category], [ActiveIngredient], [Concentration], [Phi], [DosageInfo], [TargetPests], [Toxicity], [Barcode], [Unit], [PurchasePrice], [SellingPrice], [Quantity], [MinAlertQuantity], [BatchNumber], [ExpiryDate], [SupplierId], [Notes])
              VALUES (
                N'${p.id}',
                N'${(p.name || "").replace(/'/g, "''")}',
                N'${(p.category || "").replace(/'/g, "''")}',
                N'${(p.activeIngredient || "").replace(/'/g, "''")}',
                N'${(p.concentration || "").replace(/'/g, "''")}',
                ${p.phi !== void 0 && p.phi !== null ? Number(p.phi) : "NULL"},
                N'${(p.dosageInfo || "").replace(/'/g, "''")}',
                N'${(p.targetPests || "").replace(/'/g, "''")}',
                N'${(p.toxicity || "caution").replace(/'/g, "''")}',
                N'${(p.barcode || "").replace(/'/g, "''")}',
                N'${(p.unit || "").replace(/'/g, "''")}',
                ${Number(p.purchasePrice) || 0},
                ${Number(p.sellingPrice) || 0},
                ${Number(p.quantity) || 0},
                ${Number(p.minAlertQuantity) || 5},
                N'${(p.batchNumber || "").replace(/'/g, "''")}',
                ${expSql},
                ${p.supplierId ? `N'${p.supplierId}'` : "NULL"},
                N'${(p.notes || "").replace(/'/g, "''")}'
              )
          `);
        }
      }
      if (Array.isArray(salesInvoices)) {
        for (const inv of salesInvoices) {
          const reqInv = new sql.Request(transaction);
          await reqInv.query(`
            IF EXISTS (SELECT 1 FROM [dbo].[SalesInvoices] WHERE [Id] = N'${inv.id}')
              UPDATE [dbo].[SalesInvoices] SET
                [InvoiceNumber] = N'${(inv.invoiceNumber || "").replace(/'/g, "''")}',
                [Date] = '${inv.date}',
                [CustomerId] = N'${(inv.customerId || "").replace(/'/g, "''")}',
                [CustomerName] = N'${(inv.customerName || "").replace(/'/g, "''")}',
                [CustomerPhone] = N'${(inv.customerPhone || "").replace(/'/g, "''")}',
                [Subtotal] = ${Number(inv.subtotal) || 0},
                [Discount] = ${Number(inv.discount) || 0},
                [Total] = ${Number(inv.total) || 0},
                [PaidAmount] = ${Number(inv.paidAmount) || 0},
                [RemainingAmount] = ${Number(inv.remainingAmount) || 0},
                [PaymentMethod] = N'${(inv.paymentMethod || "cash").replace(/'/g, "''")}',
                [Notes] = N'${(inv.notes || "").replace(/'/g, "''")}',
                [Status] = N'${(inv.status || "completed").replace(/'/g, "''")}'
              WHERE [Id] = N'${inv.id}'
            ELSE
              INSERT INTO [dbo].[SalesInvoices] ([Id], [InvoiceNumber], [Date], [CustomerId], [CustomerName], [CustomerPhone], [Subtotal], [Discount], [Total], [PaidAmount], [RemainingAmount], [PaymentMethod], [Notes], [Status])
              VALUES (
                N'${inv.id}',
                N'${(inv.invoiceNumber || "").replace(/'/g, "''")}',
                '${inv.date}',
                N'${(inv.customerId || "").replace(/'/g, "''")}',
                N'${(inv.customerName || "").replace(/'/g, "''")}',
                N'${(inv.customerPhone || "").replace(/'/g, "''")}',
                ${Number(inv.subtotal) || 0},
                ${Number(inv.discount) || 0},
                ${Number(inv.total) || 0},
                ${Number(inv.paidAmount) || 0},
                ${Number(inv.remainingAmount) || 0},
                N'${(inv.paymentMethod || "cash").replace(/'/g, "''")}',
                N'${(inv.notes || "").replace(/'/g, "''")}',
                N'${(inv.status || "completed").replace(/'/g, "''")}'
              )
          `);
          if (Array.isArray(inv.items)) {
            const reqDelItems = new sql.Request(transaction);
            await reqDelItems.query(`DELETE FROM [dbo].[SalesInvoiceItems] WHERE [InvoiceId] = N'${inv.id}'`);
            for (const item of inv.items) {
              const reqItem = new sql.Request(transaction);
              await reqItem.query(`
                INSERT INTO [dbo].[SalesInvoiceItems] ([InvoiceId], [ProductId], [ProductName], [Category], [ActiveIngredient], [Phi], [Unit], [UnitPrice], [PurchaseCost], [Quantity], [Total])
                VALUES (
                  N'${inv.id}',
                  N'${item.productId}',
                  N'${(item.productName || "").replace(/'/g, "''")}',
                  N'${(item.category || "").replace(/'/g, "''")}',
                  N'${(item.activeIngredient || "").replace(/'/g, "''")}',
                  ${item.phi !== void 0 && item.phi !== null ? Number(item.phi) : "NULL"},
                  N'${(item.unit || "").replace(/'/g, "''")}',
                  ${Number(item.unitPrice) || 0},
                  ${Number(item.purchaseCost) || 0},
                  ${Number(item.quantity) || 1},
                  ${Number(item.total) || 0}
                )
              `);
            }
          }
        }
      }
      if (Array.isArray(expenses)) {
        for (const exp of expenses) {
          const reqExp = new sql.Request(transaction);
          await reqExp.query(`
            IF EXISTS (SELECT 1 FROM [dbo].[Expenses] WHERE [Id] = N'${exp.id}')
              UPDATE [dbo].[Expenses] SET
                [Title] = N'${(exp.title || "").replace(/'/g, "''")}',
                [Category] = N'${(exp.category || "").replace(/'/g, "''")}',
                [Amount] = ${Number(exp.amount) || 0},
                [Date] = '${exp.date}',
                [Notes] = N'${(exp.notes || "").replace(/'/g, "''")}'
              WHERE [Id] = N'${exp.id}'
            ELSE
              INSERT INTO [dbo].[Expenses] ([Id], [Title], [Category], [Amount], [Date], [Notes])
              VALUES (
                N'${exp.id}',
                N'${(exp.title || "").replace(/'/g, "''")}',
                N'${(exp.category || "").replace(/'/g, "''")}',
                ${Number(exp.amount) || 0},
                '${exp.date}',
                N'${(exp.notes || "").replace(/'/g, "''")}'
              )
          `);
        }
      }
      await transaction.commit();
      await pool.close();
      res.json({
        success: true,
        message: "\u062A\u0645\u062A \u0645\u0632\u0627\u0645\u0646\u0629 \u0648\u0631\u0641\u0639 \u0643\u0627\u0641\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0646\u062C\u0627\u062D \u0625\u0644\u0649 \u0642\u0627\u0639\u062F\u0629 \u0628\u064A\u0627\u0646\u0627\u062A SQL Server 2012!",
        syncedCounts: {
          products: products?.length || 0,
          customers: customers?.length || 0,
          suppliers: suppliers?.length || 0,
          salesInvoices: salesInvoices?.length || 0,
          expenses: expenses?.length || 0
        }
      });
    } catch (innerErr) {
      await transaction.rollback();
      throw innerErr;
    }
  } catch (err) {
    if (pool) {
      try {
        await pool.close();
      } catch {
      }
    }
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/sqlserver/sync/pull", async (req, res) => {
  const targetDb = getActiveConfig().database || "FrozenHouseDB";
  const poolConfig = getMssqlPoolConfig({ database: targetDb });
  let pool = null;
  try {
    pool = await new sql.ConnectionPool(poolConfig).connect();
    const [settingsRes, prodsRes, custsRes, supsRes, invsRes, itemsRes, expsRes, txsRes] = await Promise.all([
      pool.request().query("SELECT TOP 1 * FROM [dbo].[StoreSettings] ORDER BY [Id] DESC"),
      pool.request().query("SELECT * FROM [dbo].[Products] ORDER BY [Name] ASC"),
      pool.request().query("SELECT * FROM [dbo].[Customers] ORDER BY [Name] ASC"),
      pool.request().query("SELECT * FROM [dbo].[Suppliers] ORDER BY [Name] ASC"),
      pool.request().query("SELECT * FROM [dbo].[SalesInvoices] ORDER BY [Date] DESC"),
      pool.request().query("SELECT * FROM [dbo].[SalesInvoiceItems]"),
      pool.request().query("SELECT * FROM [dbo].[Expenses] ORDER BY [Date] DESC"),
      pool.request().query("SELECT * FROM [dbo].[FinancialTransactions] ORDER BY [Date] DESC")
    ]);
    await pool.close();
    const itemsMap = {};
    for (const item of itemsRes.recordset) {
      if (!itemsMap[item.InvoiceId]) itemsMap[item.InvoiceId] = [];
      itemsMap[item.InvoiceId].push({
        productId: item.ProductId,
        productName: item.ProductName,
        category: item.Category,
        activeIngredient: item.ActiveIngredient,
        phi: item.Phi,
        unit: item.Unit,
        unitPrice: Number(item.UnitPrice),
        purchaseCost: Number(item.PurchaseCost),
        quantity: Number(item.Quantity),
        total: Number(item.Total)
      });
    }
    const salesInvoices = invsRes.recordset.map((inv) => ({
      id: inv.Id,
      invoiceNumber: inv.InvoiceNumber,
      date: inv.Date ? new Date(inv.Date).toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
      customerId: inv.CustomerId,
      customerName: inv.CustomerName,
      customerPhone: inv.CustomerPhone,
      items: itemsMap[inv.Id] || [],
      subtotal: Number(inv.Subtotal),
      discount: Number(inv.Discount),
      total: Number(inv.Total),
      paidAmount: Number(inv.PaidAmount),
      remainingAmount: Number(inv.RemainingAmount),
      paymentMethod: inv.PaymentMethod,
      notes: inv.Notes,
      status: inv.Status
    }));
    const products = prodsRes.recordset.map((p) => ({
      id: p.Id,
      name: p.Name,
      category: p.Category,
      activeIngredient: p.ActiveIngredient,
      concentration: p.Concentration,
      phi: p.Phi,
      dosageInfo: p.DosageInfo,
      targetPests: p.TargetPests,
      toxicity: p.Toxicity,
      barcode: p.Barcode,
      unit: p.Unit,
      purchasePrice: Number(p.PurchasePrice),
      sellingPrice: Number(p.SellingPrice),
      quantity: Number(p.Quantity),
      minAlertQuantity: Number(p.MinAlertQuantity),
      batchNumber: p.BatchNumber,
      expiryDate: p.ExpiryDate ? new Date(p.ExpiryDate).toISOString().slice(0, 10) : void 0,
      supplierId: p.SupplierId,
      notes: p.Notes
    }));
    const customers = custsRes.recordset.map((c) => ({
      id: c.Id,
      name: c.Name,
      phone: c.Phone,
      address: c.Address,
      cropTypes: c.CropTypes,
      farmArea: c.FarmArea,
      currentBalance: Number(c.CurrentBalance),
      notes: c.Notes,
      createdAt: c.CreatedAt ? new Date(c.CreatedAt).toISOString() : (/* @__PURE__ */ new Date()).toISOString()
    }));
    const suppliers = supsRes.recordset.map((s) => ({
      id: s.Id,
      name: s.Name,
      representativeName: s.RepresentativeName,
      phone: s.Phone,
      address: s.Address,
      currentBalance: Number(s.CurrentBalance),
      notes: s.notes || s.Notes,
      createdAt: s.CreatedAt ? new Date(s.CreatedAt).toISOString() : (/* @__PURE__ */ new Date()).toISOString()
    }));
    const expenses = expsRes.recordset.map((e) => ({
      id: e.Id,
      title: e.Title,
      category: e.Category,
      amount: Number(e.Amount),
      date: e.Date ? new Date(e.Date).toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
      notes: e.Notes
    }));
    let settingsObj = void 0;
    if (settingsRes.recordset.length > 0) {
      const s = settingsRes.recordset[0];
      settingsObj = {
        storeName: s.StoreName,
        ownerName: s.OwnerName,
        phone: s.Phone,
        phoneAlt: s.PhoneAlt,
        address: s.Address,
        commercialRecord: s.CommercialRecord,
        agriculturalLicense: s.AgriculturalLicense,
        taxRate: Number(s.TaxRate || 0),
        invoiceFooterNote: s.InvoiceFooterNote,
        currency: s.Currency || "\u062C.\u0645"
      };
    }
    res.json({
      success: true,
      message: "\u062A\u0645 \u062C\u0644\u0628 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0646\u062C\u0627\u062D \u0645\u0646 SQL Server 2012",
      data: {
        products,
        customers,
        suppliers,
        salesInvoices,
        expenses,
        settings: settingsObj
      }
    });
  } catch (err) {
    if (pool) {
      try {
        await pool.close();
      } catch {
      }
    }
    res.status(500).json({ success: false, error: err.message });
  }
});
var MYSQL_CONFIG_FILE = path.join(__dirname, ".mysql.config.json");
var defaultMySqlConfig = {
  host: process.env.MYSQL_HOST || "localhost",
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  // XAMPP default root password is empty
  database: process.env.MYSQL_DATABASE || "alhana_pro_erp"
};
function getActiveMySqlConfig() {
  if (fs.existsSync(MYSQL_CONFIG_FILE)) {
    try {
      const data = fs.readFileSync(MYSQL_CONFIG_FILE, "utf-8");
      return { ...defaultMySqlConfig, ...JSON.parse(data) };
    } catch {
    }
  }
  return { ...defaultMySqlConfig };
}
function saveActiveMySqlConfig(config) {
  const merged = { ...getActiveMySqlConfig(), ...config };
  fs.writeFileSync(MYSQL_CONFIG_FILE, JSON.stringify(merged, null, 2), "utf-8");
  return merged;
}
app.get("/api/mysql/config", (req, res) => {
  const cfg = getActiveMySqlConfig();
  res.json({
    success: true,
    config: {
      ...cfg,
      password: cfg.password ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : "",
      hasPassword: Boolean(cfg.password)
    }
  });
});
app.post("/api/mysql/config", (req, res) => {
  try {
    const { host, port, user, password, database } = req.body;
    const updateObj = {
      host: host || "localhost",
      port: Number(port) || 3306,
      user: user || "root",
      database: database || "mahsouly_db"
    };
    if (password !== void 0 && password !== "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022") {
      updateObj.password = password;
    }
    const saved = saveActiveMySqlConfig(updateObj);
    res.json({
      success: true,
      message: "\u062A\u0645 \u062D\u0641\u0638 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0640 XAMPP / MySQL \u0628\u0646\u062C\u0627\u062D",
      config: {
        ...saved,
        password: saved.password ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : "",
        hasPassword: Boolean(saved.password)
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});
app.post("/api/mysql/test", async (req, res) => {
  const custom = req.body.config ? { ...req.body.config } : {};
  if (custom.password === "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022") {
    custom.password = getActiveMySqlConfig().password;
  }
  const cfg = { ...getActiveMySqlConfig(), ...custom };
  const startTime = Date.now();
  let conn = null;
  try {
    conn = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      connectTimeout: 5e3
    });
    const [rows] = await conn.query("SELECT VERSION() AS version, DATABASE() AS currentDb, NOW() as serverTime");
    const latency = Date.now() - startTime;
    await conn.end();
    res.json({
      success: true,
      message: "\u062A\u0645 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0646\u062C\u0627\u062D \u0628\u0640 XAMPP (MySQL / MariaDB)!",
      latencyMs: latency,
      serverInfo: {
        version: rows[0].version,
        serverTime: rows[0].serverTime,
        database: cfg.database
      }
    });
  } catch (err) {
    if (conn) {
      try {
        await conn.end();
      } catch {
      }
    }
    let hint = "\u062A\u0623\u0643\u062F \u0645\u0646 \u0627\u0644\u0636\u063A\u0637 \u0639\u0644\u0649 \u0632\u0631 Start \u0628\u062C\u0627\u0646\u0628 MySQL \u0641\u064A \u0644\u0648\u062D\u0629 \u062A\u062D\u0643\u0645 XAMPP Control Panel";
    if (err.code === "ECONNREFUSED") {
      hint = "\u062E\u062F\u0645\u0629 MySQL \u063A\u064A\u0631 \u0645\u0634\u063A\u0644\u0629 \u0639\u0644\u0649 \u062C\u0647\u0627\u0632\u0643 \u0623\u0648 \u0627\u0644\u0645\u0646\u0641\u0630 3306 \u0645\u063A\u0644\u0642. \u0627\u0641\u062A\u062D XAMPP Control Panel \u0648\u0627\u0636\u063A\u0637 Start \u0628\u062C\u0627\u0646\u0628 MySQL.";
    } else if (err.code === "ER_ACCESS_DENIED_ERROR") {
      hint = "\u062E\u0637\u0623 \u0641\u064A \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631. \u0641\u064A XAMPP \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0647\u0648 root \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0641\u0627\u0631\u063A\u0629 (\u0627\u062A\u0631\u0643\u0647\u0627 \u0641\u0627\u0631\u063A\u0629).";
    }
    res.status(400).json({
      success: false,
      error: err.message,
      code: err.code,
      hint
    });
  }
});
app.post("/api/mysql/init-db", async (req, res) => {
  const schemaPath = path.join(__dirname, "src", "data", "mysql_schema.sql");
  if (!fs.existsSync(schemaPath)) {
    return res.status(404).json({ success: false, error: "\u0645\u0644\u0641 \u0633\u0643\u0631\u0628\u062A MySQL \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  }
  const rawScript = fs.readFileSync(schemaPath, "utf-8");
  const cfg = getActiveMySqlConfig();
  let conn = null;
  try {
    conn = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      multipleStatements: true
    });
    await conn.query(rawScript);
    await conn.end();
    res.json({
      success: true,
      message: `\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0648\u062A\u0647\u064A\u0626\u0629 \u0642\u0627\u0639\u062F\u0629 \u0628\u064A\u0627\u0646\u0627\u062A [${cfg.database}] \u0648\u0643\u0627\u0641\u0629 \u0627\u0644\u062C\u062F\u0627\u0648\u0644 \u0641\u064A XAMPP / MySQL \u0628\u0646\u062C\u0627\u062D!`
    });
  } catch (err) {
    if (conn) {
      try {
        await conn.end();
      } catch {
      }
    }
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/mysql/script", (req, res) => {
  const schemaPath = path.join(__dirname, "src", "data", "mysql_schema.sql");
  if (fs.existsSync(schemaPath)) {
    const script = fs.readFileSync(schemaPath, "utf-8");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    if (req.query.download === "true") {
      res.setHeader("Content-Disposition", 'attachment; filename="Mahsouly_XAMPP_MySQL.sql"');
    }
    return res.send(script);
  }
  res.status(404).send("Script not found");
});
app.post("/api/mysql/sync/push", async (req, res) => {
  const { products, customers, suppliers, salesInvoices, expenses, settings } = req.body;
  const cfg = getActiveMySqlConfig();
  let conn = null;
  try {
    conn = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database
    });
    if (settings) {
      await conn.query(`
        INSERT INTO \`StoreSettings\` (\`Id\`, \`StoreName\`, \`OwnerName\`, \`Phone\`, \`PhoneAlt\`, \`Address\`, \`CommercialRecord\`, \`AgriculturalLicense\`, \`InvoiceFooterNote\`, \`Currency\`)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          \`StoreName\` = VALUES(\`StoreName\`),
          \`OwnerName\` = VALUES(\`OwnerName\`),
          \`Phone\` = VALUES(\`Phone\`),
          \`PhoneAlt\` = VALUES(\`PhoneAlt\`),
          \`Address\` = VALUES(\`Address\`),
          \`CommercialRecord\` = VALUES(\`CommercialRecord\`),
          \`AgriculturalLicense\` = VALUES(\`AgriculturalLicense\`),
          \`InvoiceFooterNote\` = VALUES(\`InvoiceFooterNote\`),
          \`Currency\` = VALUES(\`Currency\`)
      `, [
        settings.storeName,
        settings.ownerName,
        settings.phone,
        settings.phoneAlt,
        settings.address,
        settings.commercialRecord,
        settings.agriculturalLicense,
        settings.invoiceFooterNote,
        settings.currency || "\u062C.\u0645"
      ]);
    }
    if (Array.isArray(suppliers)) {
      for (const s of suppliers) {
        await conn.query(`
          INSERT INTO \`Suppliers\` (\`Id\`, \`Name\`, \`RepresentativeName\`, \`Phone\`, \`Address\`, \`CurrentBalance\`, \`Notes\`)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`Name\` = VALUES(\`Name\`),
            \`RepresentativeName\` = VALUES(\`RepresentativeName\`),
            \`Phone\` = VALUES(\`Phone\`),
            \`Address\` = VALUES(\`Address\`),
            \`CurrentBalance\` = VALUES(\`CurrentBalance\`),
            \`Notes\` = VALUES(\`Notes\`)
        `, [s.id, s.name, s.representativeName, s.phone, s.address, Number(s.currentBalance) || 0, s.notes || ""]);
      }
    }
    if (Array.isArray(customers)) {
      for (const c of customers) {
        await conn.query(`
          INSERT INTO \`Customers\` (\`Id\`, \`Name\`, \`Phone\`, \`Address\`, \`CropTypes\`, \`FarmArea\`, \`CurrentBalance\`, \`Notes\`)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`Name\` = VALUES(\`Name\`),
            \`Phone\` = VALUES(\`Phone\`),
            \`Address\` = VALUES(\`Address\`),
            \`CropTypes\` = VALUES(\`CropTypes\`),
            \`FarmArea\` = VALUES(\`FarmArea\`),
            \`CurrentBalance\` = VALUES(\`CurrentBalance\`),
            \`Notes\` = VALUES(\`Notes\`)
        `, [c.id, c.name, c.phone, c.address, c.cropTypes, c.farmArea, Number(c.currentBalance) || 0, c.notes || ""]);
      }
    }
    if (Array.isArray(products)) {
      for (const p of products) {
        await conn.query(`
          INSERT INTO \`Products\` (\`Id\`, \`Name\`, \`Category\`, \`ActiveIngredient\`, \`Concentration\`, \`Phi\`, \`DosageInfo\`, \`TargetPests\`, \`Toxicity\`, \`Barcode\`, \`Unit\`, \`PurchasePrice\`, \`SellingPrice\`, \`Quantity\`, \`MinAlertQuantity\`, \`BatchNumber\`, \`ExpiryDate\`, \`SupplierId\`, \`Notes\`)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            \`Name\` = VALUES(\`Name\`),
            \`Category\` = VALUES(\`Category\`),
            \`ActiveIngredient\` = VALUES(\`ActiveIngredient\`),
            \`Concentration\` = VALUES(\`Concentration\`),
            \`Phi\` = VALUES(\`Phi\`),
            \`DosageInfo\` = VALUES(\`DosageInfo\`),
            \`TargetPests\` = VALUES(\`TargetPests\`),
            \`Toxicity\` = VALUES(\`Toxicity\`),
            \`Barcode\` = VALUES(\`Barcode\`),
            \`Unit\` = VALUES(\`Unit\`),
            \`PurchasePrice\` = VALUES(\`PurchasePrice\`),
            \`SellingPrice\` = VALUES(\`SellingPrice\`),
            \`Quantity\` = VALUES(\`Quantity\`),
            \`MinAlertQuantity\` = VALUES(\`MinAlertQuantity\`),
            \`BatchNumber\` = VALUES(\`BatchNumber\`),
            \`ExpiryDate\` = VALUES(\`ExpiryDate\`),
            \`SupplierId\` = VALUES(\`SupplierId\`),
            \`Notes\` = VALUES(\`Notes\`)
        `, [
          p.id,
          p.name,
          p.category,
          p.activeIngredient,
          p.concentration,
          p.phi !== void 0 ? p.phi : null,
          p.dosageInfo,
          p.targetPests,
          p.toxicity || "caution",
          p.barcode,
          p.unit,
          Number(p.purchasePrice) || 0,
          Number(p.sellingPrice) || 0,
          Number(p.quantity) || 0,
          Number(p.minAlertQuantity) || 5,
          p.batchNumber,
          p.expiryDate || null,
          p.supplierId || null,
          p.notes || ""
        ]);
      }
    }
    await conn.end();
    res.json({
      success: true,
      message: "\u062A\u0645\u062A \u0645\u0632\u0627\u0645\u0646\u0629 \u0648\u0631\u0641\u0639 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0646\u062C\u0627\u062D \u0625\u0644\u0649 XAMPP / MySQL!",
      syncedCounts: {
        products: products?.length || 0,
        customers: customers?.length || 0,
        suppliers: suppliers?.length || 0
      }
    });
  } catch (err) {
    if (conn) {
      try {
        await conn.end();
      } catch {
      }
    }
    res.status(500).json({ success: false, error: err.message });
  }
});
var handleDistZipDownload = (req, res) => {
  const possiblePaths = [
    path.resolve(__dirname, "dist.zip"),
    path.resolve(__dirname, "wessam_electrical_erp_dist.zip"),
    path.resolve(__dirname, "public", "dist.zip"),
    path.resolve(__dirname, "public", "wessam_electrical_erp_dist.zip"),
    path.resolve(__dirname, "dist", "dist.zip"),
    path.resolve(__dirname, "dist", "wessam_electrical_erp_dist.zip")
  ];
  const targetZip = possiblePaths.find((p) => fs.existsSync(p));
  if (!targetZip) {
    return res.status(404).json({ success: false, error: "\u0645\u0644\u0641 \u0627\u0644\u062A\u0648\u0632\u064A\u0639 \u0627\u0644\u0645\u0636\u063A\u0648\u0637 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  }
  try {
    const stat = fs.statSync(targetZip);
    res.writeHead(200, {
      "Content-Type": "application/zip",
      "Content-Length": stat.size,
      "Content-Disposition": 'attachment; filename="wessam_electrical_erp_dist.zip"',
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    });
    const stream = fs.createReadStream(targetZip);
    stream.pipe(res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};
app.get("/dist.zip", handleDistZipDownload);
app.get("/wessam_electrical_erp_dist.zip", handleDistZipDownload);
app.get("/api/download/dist-zip", handleDistZipDownload);
app.get(["/alhana_pro_erp.sql", "/frozenhouse_xampp.sql"], (req, res) => {
  const sqlPath = fs.existsSync(path.join(__dirname, "public", "frozenhouse_xampp.sql")) ? path.join(__dirname, "public", "frozenhouse_xampp.sql") : path.join(__dirname, "public", "alhana_pro_erp.sql");
  if (fs.existsSync(sqlPath)) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="frozenhouse_xampp.sql"');
    res.sendFile(sqlPath);
  } else {
    res.status(404).json({ success: false, error: "\u0645\u0644\u0641 SQL \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
  }
});
app.post("/api/assistant/chat", async (req, res) => {
  try {
    const { message, history = [], storeSummary = "" } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ success: false, error: "\u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0645\u0637\u0644\u0648\u0628\u0629" });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        fallback: true,
        error: "\u0645\u0641\u062A\u0627\u062D \u0627\u0644\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u0630\u0643\u064A \u063A\u064A\u0631 \u0645\u0641\u0639\u0644 \u0639\u0644\u0649 \u0627\u0644\u062E\u0627\u062F\u0645\u060C \u0633\u064A\u062A\u0645 \u0627\u0644\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0645\u062D\u0644\u064A \u0627\u0644\u0641\u0648\u0631\u064A."
      });
    }
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });
    const systemInstruction = `\u0623\u0646\u062A "\u0627\u0644\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u0630\u0643\u064A \u0644\u0645\u0646\u0638\u0648\u0645\u0629 \u0648\u0633\u0627\u0645 \u0644\u0644\u0623\u062F\u0648\u0627\u062A \u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0626\u064A\u0629" (ERP Smart Assistant).
\u0645\u0647\u0645\u062A\u0643 \u0645\u0633\u0627\u0639\u062F\u0629 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u062D\u0644 \u0648\u0627\u0644\u0645\u062D\u0627\u0633\u0628\u064A\u0646 \u0648\u0623\u0645\u0646\u0627\u0621 \u0627\u0644\u0645\u062E\u0632\u0646 \u0641\u064A \u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A\u060C \u0627\u0644\u0623\u0631\u0628\u0627\u062D\u060C \u0627\u0644\u0645\u062E\u0632\u0648\u0646\u060C \u0646\u0648\u0627\u0642\u0635 \u0627\u0644\u0623\u0635\u0646\u0627\u0641\u060C \u0641\u0643 \u0648\u062A\u062C\u0645\u064A\u0639 \u0627\u0644\u0623\u0635\u0646\u0627\u0641 \u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0626\u064A\u0629\u060C \u0645\u062F\u064A\u0648\u0646\u064A\u0627\u062A \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0648\u0627\u0644\u0645\u0642\u0627\u0648\u0644\u064A\u0646\u060C \u0645\u0633\u062A\u062D\u0642\u0627\u062A \u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646\u060C \u0648\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062E\u0632\u0627\u0626\u0646 \u0648\u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A.
\u062A\u062D\u062F\u062B \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0628\u0623\u0633\u0644\u0648\u0628 \u0627\u062D\u062A\u0631\u0627\u0641\u064A\u060C \u0648\u0627\u0636\u062D\u060C \u0648\u0645\u0646\u0638\u0645 \u0641\u064A \u0646\u0642\u0627\u0637 \u0642\u0635\u064A\u0631\u0629 \u0648\u0623\u0631\u0642\u0627\u0645 \u062F\u0642\u064A\u0642\u0629 \u0628\u0627\u0644\u062C\u0646\u064A\u0647 \u0627\u0644\u0645\u0635\u0631\u064A (\u062C.\u0645).
\u0627\u0639\u062A\u0645\u062F \u062F\u0627\u0626\u0645\u0627\u064B \u0639\u0644\u0649 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062D\u064A\u0629 \u0627\u0644\u062A\u0627\u0644\u064A\u0629 \u0644\u0644\u0645\u062A\u062C\u0631 \u0639\u0646\u062F \u0627\u0644\u0625\u062C\u0627\u0628\u0629:
${storeSummary}`;
    const formattedHistory = Array.isArray(history) ? history.slice(-8).map((msg) => ({
      role: msg.role === "model" ? "model" : "user",
      parts: [{ text: String(msg.text || "") }]
    })) : [];
    const contents = [
      ...formattedHistory,
      { role: "user", parts: [{ text: message }] }
    ];
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents,
      config: {
        systemInstruction
      }
    });
    return res.json({
      success: true,
      reply: response.text || "\u062A\u0645 \u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0646\u062C\u0627\u062D."
    });
  } catch (err) {
    console.error("Smart Assistant Error:", err?.message || err);
    return res.status(500).json({
      success: false,
      fallback: true,
      error: err?.message || "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0627\u0644\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u0630\u0643\u064A"
    });
  }
});
app.use(express.static(path.join(__dirname, "public")));
async function startServer() {
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, () => {
    console.log(`\u0641\u0631\u0648\u0632\u0646 \u0647\u0627\u0648\u0633 \u064A\u0639\u0645\u0644 \u0627\u0644\u0622\u0646 \u0639\u0644\u0649 \u0627\u0644\u0645\u0646\u0641\u0630: http://localhost:${PORT}`);
    console.log(`\u062F\u0639\u0645 Microsoft SQL Server 2012 \u0645\u0641\u0639\u0644 \u0648\u062C\u0627\u0647\u0632.`);
  });
}
startServer();
