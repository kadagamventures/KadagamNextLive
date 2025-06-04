module.exports = function patchPdfkitTable(doc) {
    doc.table = async function (table, options = {}) {
      const headers = table.headers || [];
      const rows = table.rows || [];
  
      const startX = options.x || doc.x;
      let startY = options.y || doc.y;
  
      const colWidths =
        options.columnWidths || Array(headers.length).fill((options.width || 500) / headers.length);
  
      const rowSpacing = options.rowSpacing ?? 0;
      const cellPadding = options.padding ?? 5;
  
      const drawRow = (row, y, isHeader = false) => {
        let rowHeight = 0;
  
        // Step 1: Measure max row height
        row.forEach((cell, i) => {
          const text = String(cell ?? "");
          const height = doc.heightOfString(text, {
            width: colWidths[i] - 2 * cellPadding,
            align: "left",
          });
          rowHeight = Math.max(rowHeight, height + 2 * cellPadding);
        });
  
        // Step 2: Draw each cell
        row.forEach((cell, i) => {
          const text = String(cell ?? "");
          const x = startX + colWidths.slice(0, i).reduce((sum, w) => sum + w, 0);
  
          // Box
          doc
            .rect(x, y, colWidths[i], rowHeight)
            .lineWidth(0.5)
            .stroke();
  
          // Text
          doc
            .font(isHeader ? "Helvetica-Bold" : "Helvetica")
            .fontSize(10)
            .text(text, x + cellPadding, y + cellPadding, {
              width: colWidths[i] - 2 * cellPadding,
              align: "left",
              lineBreak: true,
            });
        });
  
        return rowHeight;
      };
  
      // Draw headers
      let currentY = startY;
      const headerHeight = drawRow(headers, currentY, true);
      currentY += headerHeight;
  
      // Draw rows
      for (const row of rows) {
        const height = drawRow(row, currentY);
        currentY += height + rowSpacing;
  
        // Add page if needed
        if (currentY >= doc.page.height - 60) {
          doc.addPage();
          currentY = doc.y;
        }
      }
  
      doc.moveDown();
    };
  };
  