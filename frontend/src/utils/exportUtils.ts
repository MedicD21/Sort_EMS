/**
 * Export utilities for generating PDF and Excel reports
 */

// CSV Export (Excel-compatible)
export const exportToCSV = (
  data: Record<string, unknown>[],
  filename: string,
  columns?: { key: string; header: string }[]
) => {
  if (data.length === 0) {
    alert("No data to export");
    return;
  }

  // Get headers from columns config or data keys
  const headers = columns ? columns.map((c) => c.header) : Object.keys(data[0]);
  const keys = columns ? columns.map((c) => c.key) : Object.keys(data[0]);

  // Build CSV content
  const csvRows = [
    headers.join(","), // Header row
    ...data.map((row) =>
      keys
        .map((key) => {
          let value = row[key];
          // Handle nested values
          if (typeof value === "object" && value !== null) {
            value = JSON.stringify(value);
          }
          // Escape quotes and wrap in quotes if contains comma
          if (value === null || value === undefined) {
            return "";
          }
          const stringValue = String(value);
          if (
            stringValue.includes(",") ||
            stringValue.includes('"') ||
            stringValue.includes("\n")
          ) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(",")
    ),
  ];

  const csvContent = csvRows.join("\n");
  downloadFile(csvContent, `${filename}.csv`, "text/csv;charset=utf-8;");
};

// JSON Export
export const exportToJSON = (data: unknown, filename: string) => {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, `${filename}.json`, "application/json");
};

// Simple HTML table for PDF-like printing
export const exportToPrintable = (
  data: Record<string, unknown>[],
  title: string,
  columns?: { key: string; header: string }[]
) => {
  if (data.length === 0) {
    alert("No data to export");
    return;
  }

  const headers = columns ? columns.map((c) => c.header) : Object.keys(data[0]);
  const keys = columns ? columns.map((c) => c.key) : Object.keys(data[0]);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          color: #333;
        }
        h1 {
          color: #1976d2;
          border-bottom: 2px solid #1976d2;
          padding-bottom: 10px;
        }
        .meta {
          color: #666;
          margin-bottom: 20px;
          font-size: 12px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px 12px;
          text-align: left;
        }
        th {
          background-color: #1976d2;
          color: white;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        tr:hover {
          background-color: #f1f1f1;
        }
        .footer {
          margin-top: 30px;
          font-size: 10px;
          color: #999;
          border-top: 1px solid #ddd;
          padding-top: 10px;
        }
        @media print {
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="meta">
        Generated: ${new Date().toLocaleString()}<br>
        Total Records: ${data.length}
      </div>
      <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer; margin-bottom: 20px;">
        Print / Save as PDF
      </button>
      <table>
        <thead>
          <tr>
            ${headers.map((h) => `<th>${h}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${data
            .map(
              (row) =>
                `<tr>${keys
                  .map((key) => {
                    let value = row[key];
                    if (value === null || value === undefined)
                      return "<td>-</td>";
                    if (typeof value === "object")
                      value = JSON.stringify(value);
                    return `<td>${value}</td>`;
                  })
                  .join("")}</tr>`
            )
            .join("")}
        </tbody>
      </table>
      <div class="footer">
        EMS Supply Management System - ${title}
      </div>
    </body>
    </html>
  `;

  // Open in new window for printing
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
};

// Helper function to download file
const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Pre-configured export functions for common reports
export const exportLowStockReport = (data: unknown[]) => {
  const columns = [
    { key: "item_code", header: "Item Code" },
    { key: "item_name", header: "Item Name" },
    { key: "location_name", header: "Location" },
    { key: "current_quantity", header: "Current Qty" },
    { key: "par_quantity", header: "Par Level" },
    { key: "reorder_quantity", header: "Reorder Level" },
    { key: "shortage", header: "Shortage" },
    { key: "category", header: "Category" },
  ];
  return { columns, filename: "low-stock-report" };
};

export const exportUsageReport = (data: unknown[]) => {
  const columns = [
    { key: "item_code", header: "Item Code" },
    { key: "item_name", header: "Item Name" },
    { key: "category", header: "Category" },
    { key: "total_used", header: "Total Used" },
    { key: "total_received", header: "Total Received" },
    { key: "net_change", header: "Net Change" },
    { key: "average_daily_usage", header: "Avg Daily Usage" },
  ];
  return { columns, filename: "usage-report" };
};

export const exportInventorySummary = (data: unknown[]) => {
  const columns = [
    { key: "item_code", header: "Item Code" },
    { key: "item_name", header: "Item Name" },
    { key: "location_name", header: "Location" },
    { key: "quantity_on_hand", header: "On Hand" },
    { key: "quantity_allocated", header: "Allocated" },
    { key: "quantity_available", header: "Available" },
    { key: "unit_of_measure", header: "UOM" },
  ];
  return { columns, filename: "inventory-summary" };
};

export const exportReorderSuggestions = (data: unknown[]) => {
  const columns = [
    { key: "item_code", header: "Item Code" },
    { key: "item_name", header: "Item Name" },
    { key: "category_name", header: "Category" },
    { key: "current_total_stock", header: "Current Stock" },
    { key: "total_par_level", header: "Par Level" },
    { key: "shortage", header: "Shortage" },
    { key: "suggested_order_qty", header: "Suggested Qty" },
    { key: "preferred_vendor_name", header: "Vendor" },
    { key: "estimated_cost", header: "Est. Cost" },
    { key: "urgency", header: "Urgency" },
  ];
  return { columns, filename: "reorder-suggestions" };
};

export const exportPurchaseOrders = (data: unknown[]) => {
  const columns = [
    { key: "po_number", header: "PO Number" },
    { key: "vendor_name", header: "Vendor" },
    { key: "status", header: "Status" },
    { key: "order_date", header: "Order Date" },
    { key: "expected_delivery_date", header: "Expected Delivery" },
    { key: "total_cost", header: "Total Cost" },
  ];
  return { columns, filename: "purchase-orders" };
};

export const exportAuditLog = (data: unknown[]) => {
  const columns = [
    { key: "timestamp", header: "Timestamp" },
    { key: "user_name", header: "User" },
    { key: "action", header: "Action" },
    { key: "entity_type", header: "Entity Type" },
    { key: "description", header: "Description" },
  ];
  return { columns, filename: "audit-log" };
};
