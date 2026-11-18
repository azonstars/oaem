export function printHtmlDocument(options: {
  title: string;
  htmlContent: string;
  pageSize?: "A4" | "Legal";
  orientation?: "portrait" | "landscape";
  extraCss?: string;
}) {
  const {
    title,
    htmlContent,
    pageSize = "A4",
    orientation = "portrait",
    extraCss = "",
  } = options;

  const existingFrame = document.getElementById("hub-print-iframe");
  if (existingFrame) existingFrame.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "hub-print-iframe";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: ${pageSize} ${orientation};
      margin: 14mm 14mm 14mm 16mm;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Hind Siliguri', 'Kalpurush', 'SolaimanLipi', serif;
      font-size: 11.5pt;
      line-height: 1.55;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8pt 0;
      font-size: 10pt;
    }
    th, td {
      border: 1px solid #1e293b;
      padding: 4pt 6pt;
      vertical-align: top;
    }
    thead th {
      background-color: #f1f5f9 !important;
      font-weight: 700;
    }
    p { margin: 4pt 0; }
    ${extraCss}
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (_e) {
      window.print();
    }
    setTimeout(() => {
      iframe.remove();
    }, 1500);
  };

  if (iframe.contentWindow) {
    setTimeout(triggerPrint, 350);
  } else {
    triggerPrint();
  }
}

export function downloadWordHtmlDocument(options: {
  title: string;
  fileName: string;
  htmlContent: string;
}) {
  const { title, fileName, htmlContent } = options;
  const wordDoc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"/><title>${title}</title>
<style>
  @page Section1 { size: 21cm 29.7cm; margin: 1.5cm; }
  body { font-family: 'Hind Siliguri', 'Kalpurush', 'Vrinda', serif; font-size: 11.5pt; line-height: 1.65; color: #111; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
  th, td { border: 1pt solid #333; padding: 4pt 6pt; }
  thead th { background-color: #f1f5f9; font-weight: bold; }
</style>
</head>
<body><div class="Section1">${htmlContent}</div></body></html>`;

  const blob = new Blob([wordDoc], { type: "application/vnd.ms-word;charset=UTF-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith(".doc") ? fileName : `${fileName}.doc`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1200);
}
