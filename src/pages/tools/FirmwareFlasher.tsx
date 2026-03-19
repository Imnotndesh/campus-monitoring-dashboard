import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Usb, Upload, Download, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { ESPLoader, Transport } from 'esptool-js';

export default function FirmwareFlasher() {
    const { user } = useAuth();
    const [port, setPort] = useState<SerialPort | null>(null);
    const [connected, setConnected] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [firmwareUrl, setFirmwareUrl] = useState('');
    const [flashing, setFlashing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [chipInfo, setChipInfo] = useState<string | null>(null);
    const [flashMode, setFlashMode] = useState<'file' | 'url'>('file');
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (user?.role !== 'admin') {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Card className="w-96">
                    <CardHeader>
                        <CardTitle>Access Denied</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            You do not have permission to use the firmware flasher.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const connectSerial = async () => {
        try {
            const selectedPort = await navigator.serial.requestPort();
            await selectedPort.open({ baudRate: 115200 });
            setPort(selectedPort);
            setConnected(true);
            setStatus('idle');
            setMessage('Connected to probe. Reading chip info...');

            // Create transport from the serial port
            const transport = new Transport(selectedPort);
            const loader = new ESPLoader({
                transport,
                baudrate: 115200,
                romBaudrate: 115200,
                enableTracing: false,
            });

            await loader.connect();
            const chip = await loader.chip;
            const mac = await loader.readMac();
            setChipInfo(`${chip.getChipName()} (MAC: ${mac})`);
            await loader.disconnect();

            setMessage('Chip detected. Ready to flash.');
        } catch (error) {
            setStatus('error');
            setMessage(`Connection failed: ${error}`);
        }
    };

    const disconnectSerial = async () => {
        if (port) {
            await port.close();
            setPort(null);
            setConnected(false);
            setChipInfo(null);
            setMessage('Disconnected');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus('idle');
        }
    };

    const downloadFromUrl = async (url: string): Promise<Uint8Array> => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = await response.arrayBuffer();
        return new Uint8Array(buffer);
    };

    const flashFirmware = async () => {
        if (!port) return;

        setFlashing(true);
        setProgress(0);
        setStatus('idle');
        setMessage('Preparing...');

        try {
            // 1. Obtain firmware data
            let firmwareData: Uint8Array;
            if (flashMode === 'file') {
                if (!file) throw new Error('No file selected');
                firmwareData = new Uint8Array(await file.arrayBuffer());
            } else {
                if (!firmwareUrl) throw new Error('No URL provided');
                setMessage('Downloading firmware...');
                firmwareData = await downloadFromUrl(firmwareUrl);
            }

            setMessage('Connecting to bootloader...');

            // 2. Create transport and loader
            const transport = new Transport(port);
            const loader = new ESPLoader({
                transport,
                baudrate: 115200,
                romBaudrate: 115200,
                enableTracing: false,
            });

            await loader.connect();
            await loader.runStub(); // Upload stub for faster flashing
            setMessage('Erasing and writing...');

            // 3. Flash the firmware
            const flashAddress = 0x10000; // Standard offset for ESP32 apps
            const totalSize = firmwareData.length;

            await loader.flashWrite({
                address: flashAddress,
                data: firmwareData,
                erase: true,
                compress: true,
                progress: (written, total) => {
                    const percent = Math.round((written / total) * 100);
                    setProgress(percent);
                },
            });

            setMessage('Verifying...');
            await loader.flashVerify(flashAddress, firmwareData);

            setStatus('success');
            setMessage('Firmware flashed successfully! Resetting...');

            await loader.hardReset();
            await loader.disconnect();

        } catch (error) {
            setStatus('error');
            setMessage(`Flash failed: ${error}`);
        } finally {
            setFlashing(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto pb-10">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Firmware Flasher</h2>
                <p className="text-muted-foreground">
                    Flash firmware to an ESP32 via USB (Chromium browsers only).
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Usb className="h-5 w-5" />
                        Serial Connection
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!connected ? (
                        <Button onClick={connectSerial} className="w-full">
                            <Usb className="mr-2 h-4 w-4" /> Connect to Probe
                        </Button>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-muted/30 rounded">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-sm font-medium">Connected</span>
                                </div>
                                {chipInfo && (
                                    <span className="text-xs font-mono text-muted-foreground">{chipInfo}</span>
                                )}
                                <Button variant="destructive" size="sm" onClick={disconnectSerial}>
                                    Disconnect
                                </Button>
                            </div>

                            <Tabs value={flashMode} onValueChange={(v) => setFlashMode(v as 'file' | 'url')}>
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="file">Local File</TabsTrigger>
                                    <TabsTrigger value="url">Download from URL</TabsTrigger>
                                </TabsList>
                                <TabsContent value="file" className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firmware-file">Firmware File (.bin)</Label>
                                        <Input
                                            id="firmware-file"
                                            type="file"
                                            accept=".bin"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            disabled={flashing}
                                        />
                                    </div>
                                    {file && (
                                        <div className="p-3 bg-muted/20 rounded text-sm">
                                            Selected: <span className="font-mono">{file.name}</span> ({(file.size / 1024).toFixed(2)} KB)
                                        </div>
                                    )}
                                </TabsContent>
                                <TabsContent value="url" className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firmware-url">Firmware URL</Label>
                                        <Input
                                            id="firmware-url"
                                            type="url"
                                            placeholder="https://example.com/firmware.bin"
                                            value={firmwareUrl}
                                            onChange={(e) => setFirmwareUrl(e.target.value)}
                                            disabled={flashing}
                                        />
                                    </div>
                                </TabsContent>
                            </Tabs>

                            {(file || (flashMode === 'url' && firmwareUrl)) && (
                                <Button
                                    onClick={flashFirmware}
                                    disabled={flashing}
                                    className="w-full gap-2"
                                >
                                    {flashing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                    {flashing ? 'Flashing...' : 'Flash Firmware'}
                                </Button>
                            )}

                            {flashing && (
                                <div className="space-y-2">
                                    <Progress value={progress} className="h-2" />
                                    <p className="text-xs text-center text-muted-foreground">{progress}% complete</p>
                                </div>
                            )}

                            {message && (
                                <Alert variant={status === 'error' ? 'destructive' : status === 'success' ? 'default' : 'default'}>
                                    {status === 'success' && <CheckCircle className="h-4 w-4" />}
                                    {status === 'error' && <XCircle className="h-4 w-4" />}
                                    <AlertDescription>{message}</AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="text-xs text-muted-foreground space-y-1">
                <p>⚠️ If connection fails, put your ESP32 in bootloader mode:</p>
                <ul className="list-disc pl-5">
                    <li>Hold the BOOT button, press RESET (or plug in USB while holding BOOT), then release BOOT</li>
                    <li>Some boards have an automatic bootloader – try without buttons first</li>
                </ul>
                <p className="mt-2">Web Serial API works in Chrome, Edge, and Opera (not Firefox).</p>
                <p>Firmware is written to address <code className="bg-muted px-1">0x10000</code> – the standard offset for ESP32 applications.</p>
            </div>
        </div>
    );
}