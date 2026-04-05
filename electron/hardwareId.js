import si from 'systeminformation';
import crypto from 'crypto';

export async function generateHardwareId() {
    try {
        // Get multiple system identifiers
        const [cpu, system, os, network, disk, bios] = await Promise.all([
            si.cpu(),
            si.system(),
            si.osInfo(),
            si.networkInterfaces(),
            si.diskLayout(),
            si.bios()
        ]);
        
        // Create unique fingerprint
        const components = [
            cpu.serial || cpu.manufacturer + cpu.brand,
            system.serial || system.manufacturer + system.model,
            os.serial || os.hostname,
            network.find(n => n.type === 'Ethernet' || n.type === 'WiFi')?.mac || 'unknown',
            disk[0]?.serial || 'unknown',
            bios.serial || 'unknown',
            os.machine || 'unknown'
        ];
        
        // Hash the components
        const hardwareString = components.join('|');
        const hardwareId = crypto.createHash('sha256').update(hardwareString).digest('hex');
        
        return hardwareId;
    } catch (error) {
        console.error('Error generating hardware ID:', error);
        // Fallback: generate based on available info
        const fallbackId = crypto.randomBytes(32).toString('hex');
        return fallbackId;
    }
}