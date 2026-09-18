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
 * Returns the path to the scanned JPEG.
 */
async function scanDocument(jobId) {
  const outputPath = path.join(SCAN_DIR, `${jobId}_scan.jpg`);
  
  // WIA PowerShell script to trigger the scanner without GUI
  const psScript = `
    $ErrorActionPreference = "Stop"
    try {
      $deviceManager = New-Object -ComObject WIA.DeviceManager
      
      if ($deviceManager.DeviceInfos.Count -eq 0) {
        Write-Error "No WIA scanners found."
        exit 1
      }
      
      # Connect to the first scanner
      $device = $deviceManager.DeviceInfos.Item(1).Connect()
      
      # 1 = WIA_INTENT_NONE, 2 = Color, 3 = Grayscale
      # Using Color by default for now
      
      $item = $device.Items.Item(1)
      
      # WIA_DPS_DOCUMENT_HANDLING_SELECT = 3088
      # 1 = Feeder (ADF), 2 = Flatbed
      try {
        $prop = $device.Properties | Where-Object { $_.PropertyID -eq 3088 }
        if ($prop) { $prop.Value = 1 }
      } catch {
        # Ignore if property not supported
      }

      Write-Host "Starting scan..."
      $image = $item.Transfer()
      
      if (Test-Path "${outputPath}") {
        Remove-Item "${outputPath}"
      }
      
      $image.SaveFile("${outputPath}")
      Write-Host "Scan completed: ${outputPath}"
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
    
    // Clean up script
    fs.unlinkSync(scriptPath);
    
    if (fs.existsSync(outputPath)) {
      return outputPath;
    } else {
      throw new Error('Scan file was not generated.');
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
    const jpgPath = await scanDocument(jobId);
    
    console.log(`[Scanner] Creating PDF from scan...`);
    const pdfDoc = await PDFDocument.create();
    
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
    
    const pdfBytes = await pdfDoc.save();
    const pdfPath = path.join(SCAN_DIR, `${jobId}_copy.pdf`);
    fs.writeFileSync(pdfPath, pdfBytes);
    
    // Clean up JPG
    fs.unlinkSync(jpgPath);
    
    console.log(`[Scanner] PDF created at ${pdfPath}`);
    return pdfPath;
  } catch (error) {
    console.error(`[Scanner] Error during scan to PDF:`, error);
    throw error;
  }
}

module.exports = {
  scanAndCreatePDF,
  SCAN_DIR
};
