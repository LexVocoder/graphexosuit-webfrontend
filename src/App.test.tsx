/**
 * Tests for graphexosuit.layer.backend.frontend.App
 *
 * Responsibilities:
 *  - Test screen routing
 *  - Test navigation between screens
 *  - Test AppProvider setup
 *  - Test header rendering
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import App from "@/App"
import * as apiClient from "@/api/client"

vi.mock("@/api/client")
vi.mock("@monaco-editor/react", () => ({
  default: vi.fn(({ value, onChange }) => (
    <textarea data-testid="json-editor" value={value} onChange={e => onChange?.(e.target.value)} />
  )),
}))

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.getConfig).mockResolvedValue({
      workflow_name: "Test Workflow",
      sample_initial_state: null,
    })
  })

  it("should render header from backend config", async () => {
    render(<App />)

    expect(document.title).toBe("Loading...")

    await waitFor(() => {
      expect(screen.getByText("Test Workflow")).toBeInTheDocument()
      expect(document.title).toBe("Test Workflow")
    })
  })

  it("should fall back to graphexosuit when config fetch fails", async () => {
    vi.mocked(apiClient.getConfig).mockRejectedValue(new Error("Config unavailable"))

    render(<App />)

    expect(document.title).toBe("Loading...")

    await waitFor(() => {
      expect(screen.getByText("graphexosuit")).toBeInTheDocument()
      expect(document.title).toBe("graphexosuit")
    })
  })

  it("should start on pre-run screen", () => {
    render(<App />)
    expect(screen.getByText("Initial State")).toBeInTheDocument()
  })

  it("should navigate to execution-progress on Run", async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.runGraph).mockResolvedValueOnce({
      thread_id: "test123",
      poll_url: "/thread/test123",
    })

    vi.mocked(apiClient.pollThread).mockResolvedValueOnce({
      status: "running",
      output_lines: [],
      created_at: "2024-01-01T00:00:00Z",
    })

    render(<App />)

    await user.click(screen.getByRole("button", { name: /run graph/i }))

    await waitFor(() => {
      expect(screen.getByText("Execution Progress")).toBeInTheDocument()
    })
  })

  it("should navigate back to pre-run on Start Over", async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.runGraph).mockResolvedValueOnce({
      thread_id: "test123",
      poll_url: "/thread/test123",
    })

    vi.mocked(apiClient.pollThread).mockResolvedValueOnce({
      status: "completed",
      output_lines: [],
      created_at: "2024-01-01T00:00:00Z",
      result: {
        thread_id: "test123",
        final_result: { result: "done" },
      },
    })

    render(<App />)

    await user.click(screen.getByRole("button", { name: /run graph/i }))

    await waitFor(() => {
      expect(screen.getByText("Execution Progress")).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /start over/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: /start over/i }))

    await waitFor(() => {
      expect(screen.getByText("Initial State")).toBeInTheDocument()
    })
  })

  it("should render AppProvider wrapping screens", async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.runGraph).mockResolvedValueOnce({
      thread_id: "test123",
      poll_url: "/thread/test123",
    })

    vi.mocked(apiClient.pollThread).mockResolvedValueOnce({
      status: "running",
      output_lines: [],
      created_at: "2024-01-01T00:00:00Z",
    })

    render(<App />)

    // AppProvider should be active from the start (pre-run screen has polling interval)
    await waitFor(() => {
      expect(screen.getByText("Test Workflow")).toBeInTheDocument()
    })

    // Navigate to execution screen
    await user.click(screen.getByRole("button", { name: /run graph/i }))

    // AppProvider should still be active (execution screen also uses context)
    await waitFor(() => {
      expect(screen.getByText("Execution Progress")).toBeInTheDocument()
    })
  })

  it("should maintain thread_id across screen transitions", async () => {
    const user = userEvent.setup()
    const threadId = "test123"
    vi.mocked(apiClient.runGraph).mockResolvedValueOnce({
      thread_id: threadId,
      poll_url: `/thread/${threadId}`,
    })

    vi.mocked(apiClient.pollThread).mockResolvedValueOnce({
      status: "completed",
      output_lines: [],
      created_at: "2024-01-01T00:00:00Z",
      result: {
        thread_id: threadId,
        final_result: { result: "done" },
      },
    })

    render(<App />)

    await user.click(screen.getByRole("button", { name: /run graph/i }))

    await waitFor(() => {
      expect(screen.getByText(new RegExp(threadId))).toBeInTheDocument()
    })
  })
})
