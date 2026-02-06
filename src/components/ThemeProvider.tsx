import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light"
type ThemeColor = "zinc" | "blue" | "emerald" | "orange" | "violet"

type ThemeProviderProps = {
    children: React.ReactNode
    defaultTheme?: Theme
    defaultColor?: ThemeColor
    storageKey?: string
}

type ThemeProviderState = {
    theme: Theme
    color: ThemeColor
    setTheme: (theme: Theme) => void
    setColor: (color: ThemeColor) => void
}

const ThemeProviderContext = createContext<ThemeProviderState>({
    theme: "dark",
    color: "zinc",
    setTheme: () => null,
    setColor: () => null,
})

// These must match Tailwind HSL format (no 'deg', just space separated numbers)
const COLORS: Record<ThemeColor, string> = {
    zinc: "0 0% 98%",             // White-ish for Dark Mode Primary
    blue: "217.2 91.2% 59.8%",    // Blue 500
    emerald: "142.1 76.2% 36.3%", // Emerald 500
    orange: "20.5 90.2% 48.2%",   // Orange 500
    violet: "262.1 83.3% 57.8%",  // Violet 500
}

export function ThemeProvider({
                                  children,
                                  defaultTheme = "dark",
                                  defaultColor = "zinc",
                                  storageKey = "vite-ui-theme",
                                  ...props
                              }: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(
        () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
    )

    const [color, setColor] = useState<ThemeColor>(
        () => (localStorage.getItem(`${storageKey}-color`) as ThemeColor) || defaultColor
    )

    useEffect(() => {
        const root = window.document.documentElement

        // 1. Reset Classes
        root.classList.remove("light", "dark")
        root.classList.add(theme)

        // 2. Apply Dynamic Primary Color
        // If user picks 'zinc' (default), we don't override, letting index.css handle it.
        // If they pick a color, we override the CSS variable.
        if (color !== 'zinc') {
            root.style.setProperty("--primary", COLORS[color])
            // For colored themes, standard white text usually looks best on top
            root.style.setProperty("--primary-foreground", "0 0% 100%")
            root.style.setProperty("--ring", COLORS[color])
        } else {
            root.style.removeProperty("--primary")
            root.style.removeProperty("--primary-foreground")
            root.style.removeProperty("--ring")
        }

    }, [theme, color])

    const value = {
        theme,
        color,
        setTheme: (t: Theme) => {
            localStorage.setItem(storageKey, t)
            setTheme(t)
        },
        setColor: (c: ThemeColor) => {
            localStorage.setItem(`${storageKey}-color`, c)
            setColor(c)
        },
    }

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext)
    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider")
    return context
}