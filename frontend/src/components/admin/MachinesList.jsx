import React from 'react';
import { Printer } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export const MachinesList = ({ machines, onCreateTestMachine, onToggleMachineStatus }) => (
  <Card glass className="mt-6">
    <div className="flex justify-between align-center mb-4">
      <div className="flex align-center gap-2">
        <div className="stat-icon" style={{ background: 'var(--primary-50)', width: 32, height: 32 }}>
          <Printer size={16} style={{ color: 'var(--primary-color)' }} />
        </div>
        <h3 className="font-bold">Franchisee Machines</h3>
      </div>
      {/* <Button variant="primary" onClick={onCreateTestMachine} style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>
        + Add Test Machine
      </Button> */}
    </div>
    
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {machines.length === 0 ? (
        <p className="text-muted text-sm">No machines registered.</p>
      ) : (
        machines.map(machine => (
          <div key={machine.id} className="job-row flex justify-between align-center" style={{ padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
            <div>
              <p className="font-semibold text-md">{machine.name} - {machine.location || 'No Location'}</p>
              <p className="text-xs text-muted">Key: {machine.machineKey}</p>
              <p className="text-xs text-muted mt-1">Company: {machine.company?.name || 'N/A'}</p>
            </div>
            <div className="flex align-center gap-4">
              <Badge status={machine.status} />
              <Button 
                onClick={() => onToggleMachineStatus(machine.id, machine.status)}
                style={{ 
                  background: machine.status === 'ACTIVE' ? 'var(--warning-100)' : 'var(--success-100)', 
                  color: machine.status === 'ACTIVE' ? 'var(--warning-700)' : 'var(--success-700)',
                  padding: '4px 12px',
                  fontSize: '0.75rem'
                }}
              >
                {machine.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  </Card>
);
