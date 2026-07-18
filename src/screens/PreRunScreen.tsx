/**
 * graphexosuit.layer.backend.frontend.screens.PreRunScreen
 *
 * Responsibilities:
 *  - Display JSON editor with initial state (prettified `{"initial_value":{"key":"value"}}`)
 *  - Validate JSON in real-time
 *  - Provide Run button (disabled if JSON invalid or request pending)
 *  - Call runGraph() API and transition to execution-progress on success
 *  - Display error toast on failure
 */

import { useState, useEffect, useRef } from "react"
import Editor from "@monaco-editor/react"
import { getConfig, runGraph } from "@/api/client"

interface PreRunScreenProps {
  onStartRun: (threadId: string) => void
}

const DEFAULT_SAMPLE_INITIAL_STATE = {
  key: "value",
}

function getInitialStateContent(sampleInitialState: unknown): string {
  return JSON.stringify(
    {
      initial_state: sampleInitialState ?? DEFAULT_SAMPLE_INITIAL_STATE,
    },
    null,
    2
  )
}

/**
 * PreRunScreen component: Initial state input and graph launch.
 *
 * Why: Allows user to input initial state and launch graph execution.
 *
 * Args:
 *   onStartRun: Callback when run succeeds, passed thread_id.
 */
function PreRunScreen({ onStartRun }: PreRunScreenProps) {
  const [jsonContent, setJsonContent] = useState<string>(getInitialStateContent(undefined))
  const [isJsonValid, setIsJsonValid] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasUserEditedRef = useRef(false)

  useEffect(() => {
    let isActive = true

    const loadSampleInitialState = async () => {
      try {
        const config = await getConfig()

        if (isActive && !hasUserEditedRef.current) {
          setJsonContent(getInitialStateContent(config.sample_initial_state))
        }
      } catch {
        // Keep fallback default when config request fails.
      }
    }

    void loadSampleInitialState()

    return () => {
      isActive = false
    }
  }, [])

  /**
   * Validate JSON whenever content changes.
   */
  useEffect(() => {
    try {
      JSON.parse(jsonContent)
      setIsJsonValid(true)
    } catch {
      setIsJsonValid(false)
    }
  }, [jsonContent])

  /**
   * Handle Run button click: parse JSON and invoke runGraph API.
   */
  const handleRun = async () => {
    setError(null)
    setIsLoading(true)

    try {
      const parsedState = JSON.parse(jsonContent)
      const response = await runGraph(parsedState)
      onStartRun(response.thread_id)
    } catch (err) {
      // Catch JSON parsing error or network error
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      setError(`Failed to start graph execution: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Initial State</h2>
        <p className="text-gray-600">
          Edit the JSON below to set the initial state for the graph execution.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message mb-6" role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      {/* JSON Editor */}
      <div className="mb-6 border border-gray-300 rounded-md overflow-hidden">
        <Editor
          height="400px"
          defaultLanguage="json"
          value={jsonContent}
          onChange={value => {
            hasUserEditedRef.current = true
            setJsonContent(value || "")
          }}
          options={{
            minimap: { enabled: false },
            wordWrap: "on",
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            folding: true,
          }}
          theme="light"
        />
      </div>

      {/* Validation Error */}
      {!isJsonValid && (
        <div className="error-message mb-6" role="alert" aria-describedby="json-error">
          <span id="json-error">Invalid JSON. Please fix the syntax.</span>
        </div>
      )}

      {/* Run Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleRun}
          disabled={!isJsonValid || isLoading}
          className="btn-primary flex items-center gap-2"
          aria-label={isLoading ? "Starting graph execution..." : "Run graph"}
          aria-busy={isLoading}
        >
          {isLoading && <span className="spinner" aria-hidden="true"></span>}
          {isLoading ? "Running..." : "Run"}
        </button>
      </div>
    </div>
  )
}

export default PreRunScreen
