export type SchemaSummary = {
    tables: Array<{
        name: string;
        columns: Array<{ name: string; type: string }>;
    }>;
};