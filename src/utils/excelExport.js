import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/**
 * Exports JSON data to an Excel file.
 * @param {Array} data - The array of objects to export.
 * @param {string} fileName - The name of the exported file.
 */
export const exportToExcel = (data, fileName) => {
  if (!data || data.length === 0) {
    alert("No data to export.");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const excelBlob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(excelBlob, `${fileName}.xlsx`);
};
