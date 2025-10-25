# 🎉 BOM Generation Feature - Quick Start Guide

## ✨ What's New

Your RSSPL Sales Dashboard now includes two powerful new features:

### 1. 📋 BOM (Bill of Materials) Generation
Create and manage customer project specifications with professional Excel export capabilities.

### 2. ⚠️ Low Stock Alerts
Automatic notifications when inventory items are running low.

---

## 🚀 How to Use

### Accessing BOM Generation

1. **Login** to the dashboard (admin@rockersolar.com or user@rockersolar.com)
2. Look at the **left sidebar**
3. Click on **"BOM Generation"** (file icon)
4. The BOM management interface will appear in the main area

### Creating a BOM Record

1. Click the **"Add BOM"** button (blue button, top right)
2. Fill in the form fields:
   ```
   Required Fields:
   ✓ Customer Name
   ✓ Project (KW) - e.g., 5.5
   ✓ Panel Wattage - e.g., 550
   ✓ Phase - Select SINGLE or TRIPLE
   
   Optional Fields:
   - Table Option (default: Option 1)
   - AC Wire - e.g., 4mm²
   - DC Wire - e.g., 6mm²
   - LA Wire - Lightning Arrestor specs
   - Earthing Wire - e.g., 16mm²
   - No. of Legs - e.g., 4
   - Front Leg - specifications
   - Back Leg - specifications
   - Roof Design - design details
   ```
3. Click **"Add BOM Record"** to save

### Exporting BOM Data

**For Individual Customer:**
- Click the green **download icon** (↓) next to any record
- Excel file downloads automatically
- Format: `BOM_CustomerName_2025-10-17.xlsx`

**For All Customers:**
- Click the **"Export All"** button (green, top right)
- Downloads: `bom_records.xlsx`
- Contains all BOM records in tabular format

### Viewing Low Stock Alerts

**Automatic Display:**
- Low Stock Alert card appears on **Home dashboard**
- Only shows when items have ≤10 units
- Color coding:
  - 🔴 Red text = Critical (≤5 units)
  - 🟠 Orange text = Low (6-10 units)

**What to Do:**
1. Note which items are low
2. Click **"Stock In"** in sidebar
3. Reorder the low stock items

---

## 📊 Example BOM Entry

```
Customer Name: Rocker Solar Pvt Ltd
Project (KW): 10.5
Panel Wattage: 550
Table Option: Option 1
Phase: TRIPLE
AC Wire: 6mm²
DC Wire: 10mm²
LA Wire: 4mm²
Earthing Wire: 16mm²
No. of Legs: 6
Front Leg: 2.5m adjustable
Back Leg: 3m adjustable
Roof Design: Tin sheet 15° angle
```

---

## 🎯 Key Features

### BOM Management Table
- **Sortable columns** - Click headers to sort
- **Color-coded phases** - Easy visual identification
  - Blue badge = SINGLE phase
  - Purple badge = TRIPLE phase
- **Quick actions** - Export or delete with one click
- **Date tracking** - See when each BOM was created

### Low Stock Alert
- **Smart threshold** - Automatically detects low inventory
- **Top 5 display** - Shows most critical items first
- **Real-time updates** - Recalculates after stock changes
- **Professional design** - Orange gradient alert card

---

## 💡 Pro Tips

1. **Bulk Entry** - Add multiple BOM records in one session by clicking "Add BOM" repeatedly
2. **Export Before Changes** - Export all BOMs before making major inventory changes
3. **Phase Selection** - Choose carefully as it affects equipment specifications
4. **Low Stock Monitoring** - Check Home dashboard daily for alerts
5. **Customer Naming** - Use consistent naming (e.g., "ABC Corp - Site 1") for better organization

---

## 🔐 Permissions

Both **Admin** and **User** roles can:
- ✓ Create BOM records
- ✓ View BOM list
- ✓ Export BOM sheets
- ✓ Delete BOM records
- ✓ See low stock alerts

No special permissions needed!

---

## 📱 Responsive Design

The BOM feature works on all screen sizes:
- **Desktop** - Full 3-column form layout
- **Tablet** - 2-column responsive grid
- **Mobile** - Single column stacked layout

---

## 🔄 Data Flow

```
1. User fills BOM form
   ↓
2. Data sent to API (/api/bom)
   ↓
3. Saved to PostgreSQL database
   ↓
4. Appears in BOM table instantly
   ↓
5. Available for export to Excel
```

---

## 🌐 Live Demo

**Your app is now running at:**
- Local: http://localhost:3002
- Network: http://192.168.1.41:3002

**Test Credentials:**
- Admin: admin@rockersolar.com / admin123
- User: user@rockersolar.com / user123

---

## ❓ Troubleshooting

**BOM not appearing?**
- Check if you clicked "Add BOM Record" button
- Verify all required fields are filled
- Check browser console for errors

**Low stock alert not showing?**
- Only appears when items have ≤10 units
- Add some stock-out events to see it appear
- Refresh the home page

**Excel not downloading?**
- Check browser's download settings
- Ensure pop-ups are not blocked
- Try a different browser

---

## 📈 Next Steps

Now that BOM Generation is set up:

1. ✅ Add your first customer BOM
2. ✅ Export and review the Excel sheet
3. ✅ Monitor low stock alerts daily
4. ✅ Keep BOMs updated for all projects
5. ✅ Export all BOMs regularly for backup

---

**Happy BOM Managing! 🚀**

Need help? Check the full feature documentation in `BOM_FEATURE_SUMMARY.md`
