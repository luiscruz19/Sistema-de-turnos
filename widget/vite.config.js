import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
    plugins: [preact()],
    build: {
        lib: {
            entry: 'src/index.tsx',
            name: 'TurnosWidget',
            formats: ['iife'],
            fileName: () => 'widget.js',
        },
        outDir: 'dist',
        cssCodeSplit: false,
        rollupOptions: {
            output: {
                inlineDynamicImports: true,
            },
        },
    },
    define: {
        'process.env.NODE_ENV': JSON.stringify('production'),
    },
});
