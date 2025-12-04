export declare class TemplateRenderer {
    private static templatesPath;
    static renderTemplate(templateAlias: string, data: Record<string, any>): string;
    static renderString(template: string, data: Record<string, any>): string;
}
