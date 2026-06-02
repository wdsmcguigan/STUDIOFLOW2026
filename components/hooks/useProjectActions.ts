"use client"

import { useState } from "react"
import JSZip from "jszip"
import { saveAs } from "file-saver"

interface Project {
    id: string
    title: string
    status: string
    lastActivity?: string
    size?: string
    // Add other properties as needed given the loose typing in the mock data
    [key: string]: any
}

export function useProjectActions() {
    const [isExporting, setIsExporting] = useState<string | null>(null)

    const exportProject = async (project: Project) => {
        setIsExporting(project.id)
        try {
            const zip = new JSZip()

            // 1. Create Project Metadata
            const projectMetadata = {
                id: project.id,
                title: project.title,
                status: project.status,
                exportedAt: new Date().toISOString(),
                version: "1.0.0",
                modules: {
                    script: { /* mock script state */ },
                    budget: { /* mock budget state */ },
                    schedule: { /* mock schedule state */ }
                }
            }
            zip.file("project.json", JSON.stringify(projectMetadata, null, 2))

            // 2. Create Asset Structure (Mocking file fetch)
            const assetsBase = zip.folder("assets")
            if (assetsBase) {
                assetsBase.file("README.txt", "Project Assets exported from StudioFlow")
            }

            // 3. Generate Zip
            const content = await zip.generateAsync({ type: "blob" })

            // 4. Save
            saveAs(content, `${project.title.replace(/\s+/g, "_")}_archive.zip`)

        } catch (error) {
            console.error("Export failed:", error)
            alert("Failed to export project")
        } finally {
            setIsExporting(null)
        }
    }

    const archiveProject = (project: Project, updateLocalState: (id: string, newStatus: string) => void) => {
        // In a real app, API call here
        updateLocalState(project.id, "archived")
    }

    const deleteProject = (project: Project, removeFromLocalState: (id: string) => void) => {
        if (confirm(`Are you sure you want to delete "${project.title}"? This action cannot be undone.`)) {
            // In a real app, API call here
            removeFromLocalState(project.id)
        }
    }

    return {
        isExporting,
        exportProject,
        archiveProject,
        deleteProject
    }
}
