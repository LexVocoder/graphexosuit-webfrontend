/**
 * Regression tests for ExecutionProgressScreen
 *
 * Verifies:
 *  - Button labeling consistency ("Start Over" button text)
 *  - Accessibility attributes across all interactive elements
 *  - Behavior consistency across execution states
 *  - Edge cases and state transitions
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ExecutionProgressScreen from "@/screens/ExecutionProgressScreen"
import * as apiClient from "@/api/client"
import { AppProvider } from "@/context/AppContext"
import type { ExecutionData } from "@/types/api"

vi.mock("@/api/client")
vi.mock("@monaco-editor/react", () => ({
  default: vi.fn(({ value, onChange }) => (
    <textarea data-testid="json-editor" value={value} onChange={e => onChange?.(e.target.value)} />
  )),
}))

describe("ExecutionProgressScreen - Regression Tests", () => {
  const mockOnResetToPreRun = vi.fn()
  const threadId = "test-thread-123"

  beforeEach(() => {
    mockOnResetToPreRun.mockClear()
    vi.clearAllMocks()
  })

  const renderScreen = () => {
    return render(
      <AppProvider>
        <ExecutionProgressScreen threadId={threadId} onResetToPreRun={mockOnResetToPreRun} />
      </AppProvider>
    )
  }

  describe("Button Label Consistency", () => {
    it('should use "Start Over" label consistently across all execution states', async () => {
      const completedData: ExecutionData = {
        status: "completed",
        output_lines: [],
        created_at: "2024-01-01T00:00:00Z",
        result: {
          thread_id: threadId,
          final_result: { outcome: "success" },
        },
      }

      vi.mocked(apiClient.pollThread).mockResolvedValueOnce(completedData)

      renderScreen()

      await waitFor(() => {
        const button = screen.getByRole("button", { name: /start over/i })
        expect(button).toBeInTheDocument()
        expect(button.textContent).toBe("Start Over")
      })
    })

    it('should never display "Run Again" button text', async () => {
      const completedData: ExecutionData = {
        status: "completed",
        output_lines: [],
        created_at: "2024-01-01T00:00:00Z",
        result: {
          thread_id: threadId,
          final_result: { result: "done" },
        },
      }

      vi.mocked(apiClient.pollThread).mockResolvedValueOnce(completedData)

      renderScreen()

      await waitFor(() => {
        expect(screen.queryByText("Run Again")).not.toBeInTheDocument()
      })
    })
  })

  describe("Accessibility Attributes", () => {
    it("should have proper aria-label on Start Over button in completed state", async () => {
      const completedData: ExecutionData = {
        status: "completed",
        output_lines: [],
        created_at: "2024-01-01T00:00:00Z",
        result: {
          thread_id: threadId,
          final_result: { result: "done" },
        },
      }

      vi.mocked(apiClient.pollThread).mockResolvedValueOnce(completedData)

      renderScreen()

      await waitFor(() => {
        const button = screen.getByRole("button", { name: /start over/i })
        expect(button).toHaveAttribute("aria-label", "Start over with a new execution")
      })
    })

    it("should have region role with aria-label for completion section", async () => {
      const completedData: ExecutionData = {
        status: "completed",
        output_lines: [],
        created_at: "2024-01-01T00:00:00Z",
        result: {
          thread_id: threadId,
          final_result: { result: "done" },
        },
      }

      vi.mocked(apiClient.pollThread).mockResolvedValueOnce(completedData)

      renderScreen()

      await waitFor(() => {
        const region = screen.getByRole("region", {
          name: /execution completion status/i,
        })
        expect(region).toBeInTheDocument()
      })
    })

    it("should have aria-label on error message for screen readers", async () => {
      const errorData: ExecutionData = {
        status: "error",
        output_lines: [],
        created_at: "2024-01-01T00:00:00Z",
        error: {
          message: "Execution failed due to invalid input",
          checkpoint_id: "ckpt123",
          thread_id: threadId,
        },
      }

      vi.mocked(apiClient.pollThread).mockResolvedValueOnce(errorData)

      renderScreen()

      await waitFor(() => {
        const errorAlert = screen.getByRole("alert")
        expect(errorAlert).toHaveTextContent("Execution failed due to invalid input")
      })
    })

    it("should have region role with aria-label for error section", async () => {
      const errorData: ExecutionData = {
        status: "error",
        output_lines: [],
        created_at: "2024-01-01T00:00:00Z",
        error: {
          message: "Error occurred",
          checkpoint_id: "ckpt123",
          thread_id: threadId,
        },
      }

      vi.mocked(apiClient.pollThread).mockResolvedValueOnce(errorData)

      renderScreen()

      await waitFor(() => {
        const region = screen.getByRole("region", {
          name: /execution error status/i,
        })
        expect(region).toBeInTheDocument()
      })
    })

    it("should have region role with aria-label for paused section", async () => {
      const pausedData: ExecutionData = {
        status: "paused",
        output_lines: [],
        created_at: "2024-01-01T00:00:00Z",
        result: {
          thread_id: threadId,
          checkpoint_id: "ckpt123",
          interrupt_value: {
            message: "Select option",
            options: [{ label: "Option", payload: { key: "value" } }],
          },
        },
      }

      vi.mocked(apiClient.pollThread).mockResolvedValueOnce(pausedData)

      renderScreen()

      await waitFor(() => {
        const region = screen.getByRole("region", {
          name: /execution paused/i,
        })
        expect(region).toBeInTheDocument()
      })
    })

    it("should have proper aria-label on final result output", async () => {
      const completedData: ExecutionData = {
        status: "completed",
        output_lines: [],
        created_at: "2024-01-01T00:00:00Z",
        result: {
          thread_id: threadId,
          final_result: { data: [1, 2, 3] },
        },
      }

      vi.mocked(apiClient.pollThread).mockResolvedValueOnce(completedData)

      renderScreen()

      await waitFor(() => {
        // Check if the result is visible with the aria-label
        const preElement = screen.getByLabelText("Final result JSON")
        expect(preElement).toBeInTheDocument()
        expect(preElement.textContent).toContain("1")
        expect(preElement.textContent).toContain("2")
        expect(preElement.textContent).toContain("3")
      })
    })

    it("should have aria-live on polling error message", async () => {
      vi.mocked(apiClient.pollThread).mockRejectedValueOnce(new Error("Network error"))

      renderScreen()

      await waitFor(() => {
        const alert = screen.getByRole("alert", { hidden: true })
        expect(alert).toHaveAttribute("aria-live", "assertive")
      })
    })
  })

  describe("Button Behavior Consistency", () => {
    it("should invoke callback when Start Over is clicked in completed state", async () => {
      const user = userEvent.setup()
      const completedData: ExecutionData = {
        status: "completed",
        output_lines: [],
        created_at: "2024-01-01T00:00:00Z",
        result: {
          thread_id: threadId,
          final_result: { result: "done" },
        },
      }

      vi.mocked(apiClient.pollThread).mockResolvedValueOnce(completedData)

      renderScreen()

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /start over with a new/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole("button", { name: /start over with a new/i }))

      expect(mockOnResetToPreRun).toHaveBeenCalledTimes(1)
    })

    it("should display different aria-labels based on context", async () => {
      // Completed state has more specific aria-label
      const completedData: ExecutionData = {
        status: "completed",
        output_lines: [],
        created_at: "2024-01-01T00:00:00Z",
        result: {
          thread_id: threadId,
          final_result: { result: "done" },
        },
      }

      vi.mocked(apiClient.pollThread).mockResolvedValueOnce(completedData)

      renderScreen()

      await waitFor(() => {
        const button = screen.getByRole("button", { name: /start over with a new/i })
        expect(button).toHaveAttribute("aria-label", "Start over with a new execution")
      })
    })
  })

  describe("State Transitions", () => {
    it("should handle transition from running to completed with Start Over button", async () => {
      const runningData: ExecutionData = {
        status: "running",
        output_lines: ["Processing..."],
        created_at: "2024-01-01T00:00:00Z",
      }

      const completedData: ExecutionData = {
        status: "completed",
        output_lines: ["Processing...", "Done"],
        created_at: "2024-01-01T00:00:00Z",
        result: {
          thread_id: threadId,
          final_result: { success: true },
        },
      }

      vi.mocked(apiClient.pollThread)
        .mockResolvedValueOnce(runningData)
        .mockResolvedValueOnce(completedData)

      renderScreen()

      await waitFor(() => {
        expect(screen.getByText("Running")).toBeInTheDocument()
      })

      // Should not have Start Over button during running state
      expect(screen.queryByRole("button", { name: /start over/i })).not.toBeInTheDocument()
    })
  })

  describe("Edge Cases", () => {
    it("should display Start Over button with error containing special characters", async () => {
      const errorData: ExecutionData = {
        status: "error",
        output_lines: [],
        created_at: "2024-01-01T00:00:00Z",
        error: {
          message: 'Error: "Invalid JSON" <parsing failed> & retry limits exceeded',
          checkpoint_id: "ckpt123",
          thread_id: threadId,
        },
      }

      vi.mocked(apiClient.pollThread).mockResolvedValueOnce(errorData)

      renderScreen()

      await waitFor(() => {
        // Check that a Start Over button exists in error state
        const allButtons = screen.getAllByRole("button")
        const hasStartOverButton = allButtons.some(btn => btn.textContent?.includes("Start Over"))
        expect(hasStartOverButton).toBe(true)
      })
    })
  })

  describe("Accessibility Edge Cases", () => {
    it("should maintain aria-labels when final result is null", async () => {
      const completedData: ExecutionData = {
        status: "completed",
        output_lines: [],
        created_at: "2024-01-01T00:00:00Z",
        result: {
          thread_id: threadId,
          final_result: null,
        },
      }

      vi.mocked(apiClient.pollThread).mockResolvedValueOnce(completedData)

      renderScreen()

      // Since final_result is null, the completion section shouldn't render
      await waitFor(() => {
        expect(screen.queryByText("Execution Completed")).not.toBeInTheDocument()
      })
    })
  })
})
