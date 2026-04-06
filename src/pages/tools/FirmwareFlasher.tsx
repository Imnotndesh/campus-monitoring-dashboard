import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
    Loader2,
    Usb,
    Upload,
    CheckCircle,
    XCircle,
    Terminal,
    Square,
    Trash2,
    ChevronDown,
    Settings2,
    Info
} from "lucide-react";
import { useAuth } from "../../lib/auth";
import { ESPLoader, Transport } from "esptool-js";

const BAUD_RATES = [9600, 19200, 38400, 57600, 74880, 115200, 230400, 460800, 921600] as const;
type BaudRate = typeof BAUD_RATES[number];

const FLASH_ADDRESSES = [
    { label: "0x0000 - Bootloader",         value: "0x0000"  },
    { label: "0x1000 - Bootloader (ESP32)",  value: "0x1000"  },
    { label: "0x8000 - Partition Table",     value: "0x8000"  },
    { label: "0x10000 - Application (default)", value: "0x10000" },
    { label: "0xD000 - NVS",                 value: "0xD000"  },
    { label: "Custom",                       value: "custom"  },
];

export default function FirmwareFlasher() {
    const { user } = useAuth();
    const transportRef = useRef<Transport | null>(null);
    const loaderRef    = useRef<ESPLoader | null>(null);

    const [connected,  setConnected]  = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [chipInfo,   setChipInfo]   = useState<string | null>(null);
    const [baudRate,   setBaudRate]   = useState<BaudRate>(115200);
    const [resetFailed, setResetFailed] = useState(false);
    const [showManualReset, setShowManualReset] = useState(false);
    const [file,        setFile]        = useState<File | null>(null);
    const [firmwareUrl, setFirmwareUrl] = useState("");
    const [flashMode,   setFlashMode]   = useState<"file" | "url">("file");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [flashing, setFlashing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status,   setStatus]   = useState<"idle" | "success" | "error">("idle");
    const [message,  setMessage]  = useState("");

    const [flashAddressPreset, setFlashAddressPreset] = useState("0x10000");
    const [customAddress,      setCustomAddress]      = useState("");
    const [advancedOpen,       setAdvancedOpen]       = useState(false);

    const logPortRef   = useRef<SerialPort | null>(null);
    const logReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
    const decoderRef   = useRef(new TextDecoder());

    const [logLines,     setLogLines]     = useState<string[]>([]);
    const [isLogging,    setIsLogging]    = useState(false);
    const [logConnected, setLogConnected] = useState(false);
    const [logBaudRate,  setLogBaudRate]  = useState<BaudRate>(115200);
    const logEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logLines]);

    if (user?.role !== "admin") {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Card className="w-96">
                    <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            You do not have permission to use the firmware flasher.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const resolvedFlashAddress =
        flashAddressPreset === "custom"
            ? (parseInt(customAddress, 16) || 0x10000)
            : parseInt(flashAddressPreset, 16);
    const resolvedFlashAddressHex = "0x" + resolvedFlashAddress.toString(16).toUpperCase();
    const canFlash = connected && !flashing && (flashMode === "file" ? !!file : !!firmwareUrl.trim());

    // esptool terminal - pipes all loader output (stub, erase, write progress) into the log panel
    const appendLog = (line: string) => setLogLines(prev => [...prev, line]);
    const makeTerminal = () => ({
        clean()                { },
        writeLine(d: string)   { appendLog(d); },
        write(d: string)       { appendLog(d); },
    });

    // FLASHER FUNCTIONS
    // -----------------
    // loader.main() is the single correct entry point:
    //   detectChip -> getChipDescription -> readMac -> runStub -> optional changeBaud
    // It calls transport.connect() which calls device.open() internally.
    // Never call port.open() manually before this.

    const connectSerial = async () => {
        setConnecting(true);
        setStatus("idle");
        setMessage("");
        try {
            const selectedPort = await navigator.serial.requestPort();
            const transport = new Transport(selectedPort, false);
            const loader = new ESPLoader({
                transport,
                baudrate: baudRate,
                terminal: makeTerminal(),
                debugLogging: false,
            });
            // main() opens port, detects chip, uploads stub - all in one call
            const chipDesc = await loader.main();
            const mac = await loader.chip.readMac(loader);
            setChipInfo(chipDesc + " - MAC: " + mac);
            transportRef.current = transport;
            loaderRef.current    = loader;
            setConnected(true);
            setMessage("Chip detected. Ready to flash.");
        } catch (err) {
            setStatus("error");
            setMessage("Connection failed: " + err);
        } finally {
            setConnecting(false);
        }
    };

    // transport.disconnect() cancels active readers and calls device.close().
    // Never call port.close() manually alongside this.
    const disconnectSerial = async () => {
        try { await transportRef.current?.disconnect(); } catch (_) {}
        transportRef.current = null;
        loaderRef.current    = null;
        setConnected(false);
        setChipInfo(null);
        setStatus("idle");
        setMessage("Disconnected.");
    };

    const handleFlashModeChange = (mode: "file" | "url") => {
        setFlashMode(mode);
        if (mode === "url") { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }
        else                 { setFirmwareUrl(""); }
        setStatus("idle");
        setMessage("");
    };

    const flashFirmware = async () => {
        const loader = loaderRef.current;
        if (!loader) return;
        setFlashing(true);
        setProgress(0);
        setStatus("idle");
        setMessage("Preparing firmware...");
        setShowManualReset(false);
        appendLog("");
        appendLog("-- Flash started at " + new Date().toLocaleTimeString() + " --");
        try {
            let firmwareData: Uint8Array;
            if (flashMode === "file") {
                if (!file) throw new Error("No file selected.");
                firmwareData = new Uint8Array(await file.arrayBuffer());
            } else {
                if (!firmwareUrl.trim()) throw new Error("No URL provided.");
                setMessage("Downloading firmware...");
                const res = await fetch(firmwareUrl);
                if (!res.ok) throw new Error("HTTP " + res.status + ": " + res.statusText);
                firmwareData = new Uint8Array(await res.arrayBuffer());
            }
            setMessage("Writing " + (firmwareData.length / 1024).toFixed(1) + " KB to " + resolvedFlashAddressHex + "...");
            const binaryString = Array.from(firmwareData, (b: number) => String.fromCharCode(b)).join("");
            await loader.writeFlash({
                fileArray: [{ data: binaryString, address: resolvedFlashAddress }],
                flashSize: "keep",
                flashMode: "keep",
                flashFreq: "keep",
                eraseAll: false,
                compress: true,
                reportProgress: (_i: number, written: number, total: number) => {
                    setProgress(Math.round((written / total) * 100));
                },
                calculateMD5Hash: () => "",
            });
            setMessage("Attempting to reset chip...");
            let resetSuccessful = false;
            const resetStrategies = ["soft_reset", "hard_reset"];
            for (const strategy of resetStrategies) {
                try {
                    await loader.after(strategy);
                    resetSuccessful = true;
                    setStatus("success");
                    setMessage("Firmware flashed and chip reset successfully using " + strategy + "!");
                    appendLog("-- Reset successful with " + strategy + " --");
                    break;
                } catch (e) {
                    console.warn(strategy + " failed:", e);
                    appendLog("-- " + strategy + " failed, trying next method --");
                }
            }
            if (!resetSuccessful) {
                appendLog("-- Automatic reset methods failed --");
                setShowManualReset(true);
                setMessage("Firmware flashed! Please manually reset your device.");
            }
            try { await transportRef.current?.disconnect(); } catch (_) { }
            transportRef.current = null;
            loaderRef.current = null;
            setConnected(false);
            setChipInfo(null);
            setProgress(100);
            appendLog("-- Flash complete --");
            appendLog("");
        } catch (err) {
            setStatus("error");
            setMessage("Flash failed: " + err);
            appendLog("-- Flash error: " + err + " --");
        } finally {
            setFlashing(false);
        }
    };

    const connectLogPort = async () => {
        try {
            const port = await navigator.serial.requestPort();
            await port.open({ baudRate: logBaudRate });
            logPortRef.current = port;
            setLogConnected(true);
            appendLog("-- Logger connected at " + logBaudRate + " baud --");
        } catch (err) {
            appendLog("-- Logger connect error: " + err + " --");
        }
    };

    const disconnectLogPort = async () => {
        await stopLogging();
        try { await logPortRef.current?.close(); } catch (_) {}
        logPortRef.current = null;
        setLogConnected(false);
        appendLog("-- Logger disconnected --");
    };

    const startLogging = async () => {
        const port = logPortRef.current;
        if (!port?.readable) {
            appendLog("-- Port not readable. Connect the logger port first. --");
            return;
        }
        decoderRef.current = new TextDecoder();
        const reader = port.readable.getReader();
        logReaderRef.current = reader;
        setIsLogging(true);
        let partial = "";
        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                const text = decoderRef.current.decode(value, { stream: true });
                const all = partial + text;
                const lines = all.split(/\r?\n/);
                partial = lines.pop() ?? "";
                if (lines.length > 0) {
                    setLogLines(prev => [...prev, ...lines]);
                }
            }
            if (partial) setLogLines(prev => [...prev, partial]);
        } catch (err) {
            const name = (err as Error)?.name;
            const msg  = (err as Error)?.message ?? "";
            const expected = name === "AbortError" || (name === "NetworkError" && msg.toLowerCase().includes("device has been lost"));
            if (expected) {
                appendLog("-- Device disconnected or reset --");
            } else {
                console.error("Logger read error:", err);
                appendLog("-- Read error: " + err + " --");
            }
        } finally {
            logReaderRef.current = null;
            setIsLogging(false);
        }
    };

    const stopLogging = async () => {
        try { await logReaderRef.current?.cancel(); } catch (_) {}
        logReaderRef.current = null;
        setIsLogging(false);
    };

    const clearLogs = () => setLogLines([]);

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-10">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Firmware Flasher</h2>
                <p className="text-muted-foreground">
                    Flash firmware to an ESP32 and view live serial output. Requires a Chromium-based browser.
                </p>
            </div>

            <Tabs defaultValue="flasher" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="flasher"><Usb className="h-4 w-4 mr-2" />Flasher</TabsTrigger>
                    <TabsTrigger value="logger"><Terminal className="h-4 w-4 mr-2" />Serial Logger</TabsTrigger>
                </TabsList>

                <TabsContent value="flasher" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Usb className="h-5 w-5" />Serial Connection</CardTitle>
                            <CardDescription>Connect an ESP32 in bootloader mode via Web Serial.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!connected ? (
                                <div className="space-y-4">
                                    <div className="flex items-end gap-3">
                                        <div className="space-y-1.5">
                                            <Label>Baud Rate</Label>
                                            <Select value={String(baudRate)} onValueChange={v => setBaudRate(Number(v) as BaudRate)} disabled={connecting}>
                                                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {BAUD_RATES.map(r => <SelectItem key={r} value={String(r)}>{r.toLocaleString()} baud</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button onClick={connectSerial} disabled={connecting}>
                                            {connecting
                                                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Connecting...</>
                                                : <><Usb className="mr-2 h-4 w-4" />Connect to Device</>}
                                        </Button>
                                    </div>
                                    {message && status === "error" && (
                                        <Alert variant="destructive">
                                            <XCircle className="h-4 w-4" />
                                            <AlertDescription>{message}</AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                                        <div className="flex items-center gap-3">
                                            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <div>
                                                <span className="text-sm font-semibold">Connected</span>
                                                {chipInfo && <span className="ml-2 text-xs font-mono text-muted-foreground">{chipInfo}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary">{baudRate.toLocaleString()} baud</Badge>
                                            <Button variant="destructive" size="sm" onClick={disconnectSerial} disabled={flashing}>Disconnect</Button>
                                        </div>
                                    </div>

                                    <Tabs value={flashMode} onValueChange={v => handleFlashModeChange(v as "file" | "url")}>
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="file">Local File</TabsTrigger>
                                            <TabsTrigger value="url">Download from URL</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="file" className="space-y-3 pt-3">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="fw-file">Firmware File (.bin)</Label>
                                                <Input id="fw-file" type="file" accept=".bin" ref={fileInputRef}
                                                       onChange={e => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setStatus("idle"); setMessage(""); } }}
                                                       disabled={flashing} />
                                            </div>
                                            {file && (
                                                <div className="flex items-center justify-between p-2.5 bg-muted/20 rounded text-sm border">
                                                    <span className="font-mono truncate max-w-xs">{file.name}</span>
                                                    <span className="text-muted-foreground text-xs ml-2 shrink-0">{(file.size / 1024).toFixed(1)} KB</span>
                                                </div>
                                            )}
                                        </TabsContent>
                                        <TabsContent value="url" className="space-y-3 pt-3">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="fw-url">Firmware URL</Label>
                                                <Input id="fw-url" type="url" placeholder="https://example.com/firmware.bin"
                                                       value={firmwareUrl}
                                                       onChange={e => { setFirmwareUrl(e.target.value); setStatus("idle"); setMessage(""); }}
                                                       disabled={flashing} />
                                            </div>
                                        </TabsContent>
                                    </Tabs>

                                    <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                                        <CollapsibleTrigger asChild>
                                            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground -ml-1">
                                                <Settings2 className="h-3.5 w-3.5" />
                                                Advanced Options
                                                <ChevronDown className={"h-3.5 w-3.5 transition-transform " + (advancedOpen ? "rotate-180" : "")} />
                                            </Button>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="space-y-3 pt-3">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <Label>Flash Address</Label>
                                                    <Select value={flashAddressPreset} onValueChange={setFlashAddressPreset} disabled={flashing}>
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            {FLASH_ADDRESSES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                {flashAddressPreset === "custom" && (
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="custom-addr">Custom Address (hex)</Label>
                                                        <Input id="custom-addr" placeholder="0x10000" className="font-mono"
                                                               value={customAddress} onChange={e => setCustomAddress(e.target.value)} disabled={flashing} />
                                                    </div>
                                                )}
                                            </div>
                                            {flashAddressPreset !== "custom" && (
                                                <p className="text-xs text-muted-foreground">
                                                    Writing to <code className="bg-muted px-1 rounded">{resolvedFlashAddressHex}</code>
                                                </p>
                                            )}
                                        </CollapsibleContent>
                                    </Collapsible>

                                    <Button onClick={flashFirmware} disabled={!canFlash} className="w-full gap-2" size="lg">
                                        {flashing
                                            ? <><Loader2 className="h-4 w-4 animate-spin" />Flashing...</>
                                            : <><Upload className="h-4 w-4" />Flash to {resolvedFlashAddressHex}</>}
                                    </Button>

                                    {flashing && (
                                        <div className="space-y-1.5">
                                            <Progress value={progress} className="h-2" />
                                            <p className="text-xs text-center text-muted-foreground">{progress}% complete</p>
                                        </div>
                                    )}

                                    {message && (
                                        <Alert variant={status === "error" ? "destructive" : "default"}>
                                            {status === "success" && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                                            {status === "error"   && <XCircle className="h-4 w-4" />}
                                            {status === "idle" && flashing && <Loader2 className="h-4 w-4 animate-spin" />}
                                            <AlertDescription>{message}</AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="text-xs text-muted-foreground rounded-lg border p-4 bg-muted/10 space-y-1.5">
                        <p className="font-medium text-foreground/70">Bootloader mode</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Hold BOOT, press RESET, then release BOOT.</li>
                            <li>Many boards have auto-download mode - try without buttons first.</li>
                        </ul>
                        <p className="pt-1">Esptool output (stub upload, write progress) is visible in the Serial Logger tab during flash.</p>
                    </div>
                </TabsContent>

                <TabsContent value="logger">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Terminal className="h-5 w-5" />Serial Logger</CardTitle>
                            <CardDescription>
                                Connect a separate port instance to read live output from the device.
                                Esptool flash output also appears here automatically.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Select value={String(logBaudRate)} onValueChange={v => setLogBaudRate(Number(v) as BaudRate)} disabled={isLogging || logConnected}>
                                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {BAUD_RATES.map(r => <SelectItem key={r} value={String(r)}>{r.toLocaleString()} baud</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    {!logConnected ? (
                                        <Button size="sm" onClick={connectLogPort}>
                                            <Usb className="mr-2 h-4 w-4" />Connect Port
                                        </Button>
                                    ) : (
                                        <>
                                            <Button size="sm" onClick={startLogging} disabled={isLogging}>
                                                Start
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={stopLogging} disabled={!isLogging}>
                                                <Square className="mr-2 h-4 w-4" />Stop
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={disconnectLogPort} disabled={isLogging}>
                                                <Usb className="mr-2 h-4 w-4" />Disconnect
                                            </Button>
                                        </>
                                    )}
                                    <Button size="sm" variant="outline" onClick={clearLogs}>
                                        <Trash2 className="mr-2 h-4 w-4" />Clear
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={"text-xs flex items-center gap-1.5 " + (isLogging ? "text-emerald-500" : "text-muted-foreground")}>
                                        <span className={"h-1.5 w-1.5 rounded-full " + (isLogging ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground")} />
                                        {isLogging ? "Logging" : logConnected ? "Ready" : "Disconnected"}
                                    </span>
                                    <Badge variant="secondary" className="font-mono text-xs">{logLines.length} lines</Badge>
                                </div>
                            </div>
                            <div className="border rounded-lg p-4 h-96 overflow-y-auto bg-zinc-950 text-green-400 font-mono text-xs leading-relaxed">
                                {logLines.length === 0
                                    ? <div className="text-zinc-600 select-none">Connect a port and press Start to read output. Flash output appears here automatically.</div>
                                    : logLines.map((line, i) => (
                                        <div key={i} className="whitespace-pre-wrap break-all hover:bg-white/5 px-0.5 rounded">
                                            {line || " "}
                                        </div>
                                    ))
                                }
                                <div ref={logEndRef} />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            {resetFailed && (
                <Alert variant="default" className="border-amber-500 bg-amber-500/10">
                    <Info className="h-4 w-4 text-amber-500" />
                    <AlertDescription className="text-amber-600">
                        The chip did not restart automatically. Please manually reset your ESP32 by doing one of the following:
                        <ul className="list-disc pl-5 mt-1">
                            <li>Press the physical <strong>RESET</strong> (EN) button on the board.</li>
                            <li>Press and hold the <strong>BOOT</strong> button, then press and release <strong>RESET</strong>, then release <strong>BOOT</strong>.</li>
                            <li>If those don't work, unplug the USB cable, wait a few seconds, and plug it back in.</li>
                        </ul>
                    </AlertDescription>
                </Alert>
            )}
            {showManualReset && (
                <Alert variant="default" className="border-amber-500 bg-amber-500/10">
                    <Info className="h-4 w-4 text-amber-500" />
                    <AlertDescription className="text-amber-600">
                        The chip did not restart automatically. Please manually reset your ESP32 by doing one of the following:
                        <ul className="list-disc pl-5 mt-1">
                            <li>Press and hold the <strong>BOOT</strong> button, then press and release the <strong>EN (Reset)</strong> button, then release <strong>BOOT</strong>.</li>
                            <li>If that doesn't work, try just pressing the <strong>EN (Reset)</strong> button.</li>
                            <li>As a last resort, unplug the USB cable, wait a few seconds, and plug it back in.</li>
                        </ul>
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}