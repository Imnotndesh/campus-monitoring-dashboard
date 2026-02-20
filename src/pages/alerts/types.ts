export type Severity = "INFO" | "WARNING" | "CRITICAL";
export type AlertStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
export type Category = "SIGNAL" | "NETWORK" | "SYSTEM";

export interface Alert {
    id: number;
    probe_id: string;
    category: Category;
    severity: Severity;
    metric_key: string;
    threshold_value: number;
    actual_value: number;
    message: string;
    status: AlertStatus;
    occurrences: number;
    created_at: string;
    updated_at: string;
}

export interface WSMessage {
    type: "ALERT";
    payload: Alert;
}