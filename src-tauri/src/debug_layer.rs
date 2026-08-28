use crate::debug_buffer::{LogEntry, SharedDebugBuffer};
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::Subscriber;
use tracing_subscriber::{layer::Context, Layer};

pub struct DebugLayer {
    buffer: SharedDebugBuffer,
}

impl DebugLayer {
    pub fn new(buffer: SharedDebugBuffer) -> Self {
        Self { buffer }
    }
}

impl<S: Subscriber> Layer<S> for DebugLayer {
    fn on_event(&self, event: &tracing::Event<'_>, _ctx: Context<'_, S>) {
        let level = event.metadata().level().to_string();
        let target = event.metadata().target().to_string();

        let mut visitor = MessageVisitor {
            message: String::new(),
        };
        event.record(&mut visitor);

        let ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);

        let entry = LogEntry {
            ts,
            level,
            target,
            message: visitor.message,
        };

        if let Ok(mut buf) = self.buffer.write() {
            buf.push_log(entry);
        }
    }
}

struct MessageVisitor {
    message: String,
}

impl tracing::field::Visit for MessageVisitor {
    fn record_str(&mut self, field: &tracing::field::Field, value: &str) {
        if field.name() == "message" {
            self.message = value.to_string();
        }
    }

    fn record_debug(&mut self, field: &tracing::field::Field, value: &dyn std::fmt::Debug) {
        if field.name() == "message" {
            self.message = format!("{value:?}");
        }
    }
}
