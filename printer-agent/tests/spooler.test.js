const fs = require('fs');
const SpoolerMonitor = require('../src/spooler');

jest.mock('fs');
jest.useFakeTimers();

describe('SpoolerMonitor', () => {
  let mockExecFile;
  let mockSocket;
  let monitor;

  beforeEach(() => {
    mockExecFile = jest.fn();
    mockSocket = {
      emit: jest.fn()
    };
    
    monitor = new SpoolerMonitor({ 
      execFile: mockExecFile, 
      printerName: 'TestPrinter' 
    });
    
    fs.existsSync.mockReturnValue(true);
    fs.unlinkSync.mockClear();
  });

  describe('checkPrinterStatus', () => {
    it('should emit status OK when printer is healthy', () => {
      mockExecFile.mockImplementation((cmd, args, callback) => {
        // Simulate healthy output
        callback(null, 'PrinterStatus: 3, ErrorState: 0');
      });

      monitor.checkPrinterStatus(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('printer_status_update', expect.objectContaining({
        isError: false,
        errorMessage: '',
        printerName: 'TestPrinter'
      }));
    });

    it('should emit Paper Out error', () => {
      mockExecFile.mockImplementation((cmd, args, callback) => {
        callback(null, 'ErrorState: 4, Paper Out');
      });

      monitor.checkPrinterStatus(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('printer_status_update', expect.objectContaining({
        isError: true,
        errorMessage: 'Out of Paper'
      }));
    });

    it('should emit Paper Jam error', () => {
      mockExecFile.mockImplementation((cmd, args, callback) => {
        callback(null, 'ErrorState: 5');
      });

      monitor.checkPrinterStatus(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('printer_status_update', expect.objectContaining({
        isError: true,
        errorMessage: 'Paper Jam'
      }));
    });
  });

  describe('startPollingJob', () => {
    it('should emit physical success when job is cleared from queue', () => {
      const jobId = 'job123';
      
      let callCount = 0;
      mockExecFile.mockImplementation((cmd, args, callback) => {
        callCount++;
        if (callCount === 1) {
          // First poll: Job is in queue
          callback(null, JSON.stringify({ DocumentName: jobId, JobStatus: 'Printing' }));
        } else {
          // Second poll: Job is gone (success)
          callback(null, '');
        }
      });

      monitor.startPollingJob(jobId, 'temp.pdf', mockSocket);
      
      // Advance timers by 1 second (1st poll)
      jest.advanceTimersByTime(1000);
      expect(mockSocket.emit).not.toHaveBeenCalledWith('print_physical_success', expect.any(Object));
      
      // Advance timers by 1 second (2nd poll)
      jest.advanceTimersByTime(1000);
      expect(mockSocket.emit).toHaveBeenCalledWith('print_physical_success', { jobId });
      expect(fs.unlinkSync).toHaveBeenCalledWith('temp.pdf');
    });

    it('should emit physical error if spooler reports PaperJam', () => {
      const jobId = 'job456';
      
      mockExecFile.mockImplementation((cmd, args, callback) => {
        if (args.join(' ').includes('Remove-PrintJob')) return; // ignore delete call
        callback(null, JSON.stringify({ DocumentName: jobId, JobStatus: 'PaperJam' }));
      });

      monitor.startPollingJob(jobId, 'temp.pdf', mockSocket);
      
      jest.advanceTimersByTime(1000);
      expect(mockSocket.emit).toHaveBeenCalledWith('print_physical_error', { jobId, error: 'PaperJam' });
      expect(fs.unlinkSync).toHaveBeenCalledWith('temp.pdf');
    });

    it('should timeout and emit physical error if job stays in queue > 2 minutes', () => {
      const jobId = 'job789';
      
      mockExecFile.mockImplementation((cmd, args, callback) => {
        callback(null, JSON.stringify({ DocumentName: jobId, JobStatus: 'Printing' }));
      });

      monitor.startPollingJob(jobId, 'temp.pdf', mockSocket);
      
      // Advance by 119 seconds
      jest.advanceTimersByTime(119000);
      expect(mockSocket.emit).not.toHaveBeenCalledWith('print_physical_error', expect.any(Object));

      // Advance past 120 seconds
      jest.advanceTimersByTime(2000);
      expect(mockSocket.emit).toHaveBeenCalledWith('print_physical_error', { jobId, error: 'Spooler Timeout' });
    });
  });
});
