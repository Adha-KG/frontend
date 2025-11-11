"use client";

import { StatePatternExample } from "@/components/state-pattern-example";

/**
 * Demo page showcasing the State Design Pattern implementation
 */
export default function StatePatternDemoPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">State Design Pattern Demo</h1>
          <p className="text-muted-foreground">
            This page demonstrates the State Design Pattern implementation for
            managing document upload states.
          </p>
        </div>

        <StatePatternExample />

        <div className="mt-8 p-6 bg-muted rounded-lg space-y-4">
          <h2 className="text-xl font-semibold">
            About the State Design Pattern
          </h2>
          <div className="space-y-3 text-sm">
            <p>
              The <strong>State Design Pattern</strong> is a behavioral design
              pattern that allows an object to alter its behavior when its
              internal state changes. The object will appear to change its
              class.
            </p>

            <div>
              <h3 className="font-semibold mb-2">Key Components:</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  <strong>State Interface:</strong> Defines the contract for all
                  concrete states
                </li>
                <li>
                  <strong>Concrete States:</strong> Implement specific behaviors
                  for each state (Idle, Uploading, Processing, Completed, Error)
                </li>
                <li>
                  <strong>Context:</strong> Maintains a reference to the current
                  state and delegates behavior to it
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Benefits:</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  Localizes state-specific behavior and partitions behavior for
                  different states
                </li>
                <li>
                  Makes state transitions explicit and easier to understand
                </li>
                <li>
                  Makes it easy to add new states without modifying existing
                  code
                </li>
                <li>Eliminates large conditional statements based on state</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Implementation Location:</h3>
              <p className="font-mono text-xs bg-background p-2 rounded">
                /lib/patterns/document-upload-state.ts
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
