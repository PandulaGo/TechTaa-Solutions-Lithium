#Requires AutoHotkey v2.0
#SingleInstance Force
SetWorkingDir(A_ScriptDir "\frontend")

choice := MsgBox("Yes = Backend + Frontend (API & Web UI)`nNo = Frontend only (Web UI)", "Lithium - What to start?", 3)

if (choice = "Yes") {
    Run(A_ComSpec ' /k "echo Starting Lithium (Express API + Vite frontend)... && echo. && echo API:    http://localhost:10021 && echo Web UI: http://localhost:10025 && echo. && npm run dev"', , , &pid)
    Sleep(2000)
    MsgBox("API: http://localhost:10021`nWeb UI: http://localhost:10025", "Lithium Started", 64)
    Run("http://localhost:10025")
} else if (choice = "No") {
    Run(A_ComSpec ' /k "echo Starting Lithium frontend on http://localhost:10025 ... && echo. && npm run dev:web"', , , &pid)
    Sleep(2000)
    MsgBox("Starting on http://localhost:10025", "Lithium Frontend", 64)
    Run("http://localhost:10025")
}

ExitApp()
