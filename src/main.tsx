import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from "@/components/ThemeProvider"
import {Toaster} from "./components/ui/toaster.tsx";

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            {/* Wrap App in ThemeProvider */}
            <ThemeProvider defaultTheme="dark" defaultColor="zinc">
                <App />
                <Toaster />
            </ThemeProvider>
        </QueryClientProvider>
    </React.StrictMode>,
)