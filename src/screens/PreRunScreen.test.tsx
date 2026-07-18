/**
 * Tests for graphexosuit.layer.backend.frontend.screens.PreRunScreen
 *
 * Responsibilities:
 *  - Test initial state rendering with prettified JSON
 *  - Test JSON validation
 *  - Test Run button enable/disable states
 *  - Test API call on Run
 *  - Test error handling
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import PreRunScreen from "@/screens/PreRunScreen"
import * as apiClient from "@/api/client"

vi.mock("@/api/client")
vi.mock("@monaco-editor/react", () => ({
  default: vi.fn(({ value, onChange }) => (
    <textarea data-testid="json-editor" value={value} onChange={e => onChange?.(e.target.value)} />
  )),
}))

describe("PreRunScreen", () => {
  const mockOnStartRun = vi.fn()
  const sampleInitialState = {
    from: "config",
  }

  beforeEach(() => {
    mockOnStartRun.mockClear()
    vi.clearAllMocks()
    vi.mocked(apiClient.getConfig).mockResolvedValue({
      workflow_name: "Test Workflow",
      sample_initial_state: sampleInitialState,
    })
  })

  it("should load initial state from config", async () => {
    render(<PreRunScreen onStartRun={mockOnStartRun} />)

    await waitFor(() => {
      const editor = screen.getByTestId("json-editor") as HTMLTextAreaElement
      const parsed = JSON.parse(editor.value)

      expect(parsed).toEqual({
        initial_state: sampleInitialState,
      })
    })
  })

  it("should display heading and description", () => {
    render(<PreRunScreen onStartRun={mockOnStartRun} />)

    expect(screen.getByText("Initial State")).toBeInTheDocument()
    expect(screen.getByText(/Edit the JSON below/i)).toBeInTheDocument()
  })

  it("should have Run button", () => {
    render(<PreRunScreen onStartRun={mockOnStartRun} />)

    expect(screen.getByRole("button", { name: /run graph/i })).toBeInTheDocument()
  })

  it("should disable Run button on invalid JSON", async () => {
    render(<PreRunScreen onStartRun={mockOnStartRun} />)

    const editor = screen.getByTestId("json-editor") as HTMLTextAreaElement
    const runButton = screen.getByRole("button", { name: /run graph/i })

    // Valid initially
    expect(runButton).not.toBeDisabled()

    // Make invalid
    fireEvent.change(editor, { target: { value: "{invalid" } })

    await waitFor(() => {
      expect(runButton).toBeDisabled()
    })
  })

  it("should call runGraph on Run button click", async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.runGraph).mockResolvedValueOnce({
      thread_id: "abc123",
      poll_url: "/thread/abc123",
    })

    render(<PreRunScreen onStartRun={mockOnStartRun} />)

    await user.click(screen.getByRole("button", { name: /run graph/i }))

    await waitFor(() => {
      expect(apiClient.runGraph).toHaveBeenCalled()
    })
  })

  it("should call onStartRun callback on success", async () => {
    const user = userEvent.setup()
    const threadId = "thread123"
    vi.mocked(apiClient.runGraph).mockResolvedValueOnce({
      thread_id: threadId,
      poll_url: `/thread/${threadId}`,
    })

    render(<PreRunScreen onStartRun={mockOnStartRun} />)

    await user.click(screen.getByRole("button", { name: /run graph/i }))

    await waitFor(() => {
      expect(mockOnStartRun).toHaveBeenCalledWith(threadId)
    })
  })

  it("should disable Run button while request pending", async () => {
    const user = userEvent.setup()
    let resolveRunGraph: ((value: { thread_id: string; poll_url: string }) => void) | undefined
    const runGraphPromise = new Promise<{
      thread_id: string
      poll_url: string
    }>(resolve => {
      resolveRunGraph = resolve
    })
    vi.mocked(apiClient.runGraph).mockReturnValueOnce(runGraphPromise)

    render(<PreRunScreen onStartRun={mockOnStartRun} />)

    const runButton = screen.getByRole("button", { name: /run graph/i })
    await user.click(runButton)

    expect(runButton).toBeDisabled()

    resolveRunGraph?.({
      thread_id: "abc123",
      poll_url: "/thread/abc123",
    })

    await waitFor(() => {
      expect(runButton).not.toBeDisabled()
    })
  })

  it("should display error message on API failure", async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.runGraph).mockRejectedValueOnce(new Error("Network error"))

    render(<PreRunScreen onStartRun={mockOnStartRun} />)

    await user.click(screen.getByRole("button", { name: /run graph/i }))

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    })
  })

  it("should allow editing JSON", async () => {
    const user = userEvent.setup()
    render(<PreRunScreen onStartRun={mockOnStartRun} />)

    const editor = screen.getByTestId("json-editor") as HTMLTextAreaElement

    fireEvent.change(editor, { target: { value: '{"custom": "data"}' } })

    vi.mocked(apiClient.runGraph).mockResolvedValueOnce({
      thread_id: "abc123",
      poll_url: "/thread/abc123",
    })

    await user.click(screen.getByRole("button", { name: /run graph/i }))

    await waitFor(() => {
      expect(apiClient.runGraph).toHaveBeenCalledWith({
        custom: "data",
      })
    })
  })
})
