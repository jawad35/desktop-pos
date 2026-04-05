import si from 'systeminformation';
import crypto from 'crypto';

export async function generateHardwareId() {
    try {
        // Get system information
        const [cpu, system, os, network, disk] = await Promise.all([
            si.cpu(),
            si.system(),
            si.osInfo(),
            si.networkInterfaces(),
            si.diskLayout()
        ]);
        
        // Create unique identifiers
        const components = [
            cpu.serial || cpu.manufacturer + cpu.brand,
            system.serial || system.manufacturer + system.model,
            os.serial || os.hostname,
            network.find(n => n.type === 'Ethernet' || n.type === 'WiFi')?.mac || 'unknown',
            disk[0]?.serial || 'unknown'
        ];
        
        // Combine and hash to create unique hardware ID
        const hardwareString = components.join('|');
        const hardwareId = crypto.createHash('sha256').update(hardwareString).digest('hex');
        
        console.log('Hardware ID generated:', hardwareId);
        return hardwareId;
    } catch (error) {
        console.error('Error generating hardware ID:', error);
        // Fallback to basic system info
        const fallbackId = crypto.randomBytes(32).toString('hex');
        return fallbackId;
    }
}