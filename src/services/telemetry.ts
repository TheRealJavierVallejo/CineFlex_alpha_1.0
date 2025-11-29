/*
 * 📡 SERVICE: TELEMETRY
 * Handles event logging for analytics. 
 * Currently logs to console, but ready for GA/Posthog integration.
 */

type EventType = 
    | 'app_init'
    | 'model_download_start' 
    | 'model_download_success' 
    | 'model_download_fail'
    | 'generation_start'
    | 'generation_success'
    | 'generation_fail'
    | 'upgrade_modal_open'
    | 'upgrade_modal_click';

interface EventProperties {
    [key: string]: any;
}

const IS_PROD = import.meta.env.PROD;

export const logEvent = (event: EventType, properties?: EventProperties) => {
    const timestamp = new Date().toISOString();
    
    // 1. Console Log (Dev Mode)
    if (!IS_PROD) {
        console.groupCollapsed(`📊 Telemetry: ${event}`);
        console.log('Timestamp:', timestamp);
        if (properties) console.table(properties);
        console.groupEnd();
    }

    // 2. Production Analytics (Placeholder)
    // Example: window.gtag('event', event, properties);
    // Example: posthog.capture(event, properties);
};

export const identifyUser = (userId: string, traits?: EventProperties) => {
    if (!IS_PROD) {
        console.log(`👤 Identify User: ${userId}`, traits);
    }
    // posthog.identify(userId, traits);
};