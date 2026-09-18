const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const util = require('util');
const execPromise = util.promisify(exec);

const SCAN_DIR = path.join(process.cwd(), 'temp_scans');

if (!fs.existsSync(SCAN_DIR)) {
  fs.mkdirSync(SCAN_DIR, { recursive: true });
}

/**
 * Executes a PowerShell WIA script to scan from the default scanner ADF
 * Returns an array of paths to the scanned JPEGs.
 */
async function scanDocument(jobId) {
  // WIA PowerShell script to trigger the scanner without GUI
  const psScript = `
    $ErrorActionPreference = "Stop"
    try {
      $deviceManager = New-Object -ComObject WIA.DeviceManager
      
      if ($deviceManager.DeviceInfos.Count -eq 0) {
        Write-Error "No WIA scanners found."
        exit 1
      }
      
      $device = $deviceManager.DeviceInfos.Item(1).Connect()
      $item = $device.Items.Item(1)
      
      try {
        $prop = $device.Properties | Where-Object { $_.PropertyID -eq 3088 }
        if ($prop) { $prop.Value = 1 } # 1 = Feeder (ADF)
      } catch {
        # Ignore
      }

      Write-Host "Starting scan..."
      $pageCount = 1
      while ($true) {
        try {
          $image = $item.Transfer()
          $outputPath = "${SCAN_DIR}\\${jobId}_scan_temp_$pageCount.jpg"
          if (Test-Path $outputPath) { Remove-Item $outputPath }
          $image.SaveFile($outputPath)
          Write-Host "Scanned page $pageCount"
          $pageCount++
        } catch {
          Write-Host "ADF Empty or scan complete."
          break
        }
      }
    } catch {
      Write-Error $_.Exception.Message
      exit 1
    }
  `;

  const scriptPath = path.join(SCAN_DIR, `${jobId}_scan.ps1`);
  fs.writeFileSync(scriptPath, psScript);

  try {
    const { stdout, stderr } = await execPromise(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`);
    console.log(stdout);
    if (stderr) console.error(stderr);
    
    fs.unlinkSync(scriptPath);
    
    // Find all generated images
    const files = fs.readdirSync(SCAN_DIR)
      .filter(f => f.startsWith(`${jobId}_scan_temp_`) && f.endsWith('.jpg'))
      .sort((a, b) => {
        // extract page number
        const numA = parseInt(a.match(/_scan_temp_(\\d+)\\.jpg/)[1]);
        const numB = parseInt(b.match(/_scan_temp_(\\d+)\\.jpg/)[1]);
        return numA - numB;
      });

    if (files.length > 0) {
      return files.map(f => path.join(SCAN_DIR, f));
    } else {
      throw new Error('No pages were scanned. ADF might be empty.');
    }
  } catch (err) {
    console.error('Scanning failed:', err);
    if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
    throw err;
  }
}

/**
 * Scans a document and wraps it in a PDF for printing.
 */
async function scanAndCreatePDF(jobId) {
  try {
    console.log(`[Scanner] Initiating scan for job ${jobId}...`);
    const jpgPaths = await scanDocument(jobId);
    
    console.log(`[Scanner] Creating PDF from ${jpgPaths.length} scanned pages...`);
    const pdfDoc = await PDFDocument.create();
    
    for (const jpgPath of jpgPaths) {
      const imageBytes = fs.readFileSync(jpgPath);
      const image = await pdfDoc.embedJpg(imageBytes);
      
      const { width, height } = image.scale(1);
      const page = pdfDoc.addPage([width, height]);
      
      page.drawImage(image, {
        x: 0,
        y: 0,
        width,
        height
      });
      
      // Clean up JPG after embedding
      fs.unlinkSync(jpgPath);
    }
    
    const pdfBytes = await pdfDoc.save();
    const pdfPath = path.join(SCAN_DIR, `${jobId}_copy.pdf`);
    fs.writeFileSync(pdfPath, pdfBytes);
    
    console.log(`[Scanner] PDF created at ${pdfPath}`);
    return { pdfPath, pages: jpgPaths.length };
  } catch (error) {
    console.error(`[Scanner] Error during scan to PDF:`, error);
    throw error;
  }
}

module.exports = {
  scanAndCreatePDF,
  SCAN_DIR
};
