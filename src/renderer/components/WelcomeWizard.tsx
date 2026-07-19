import React, { useState } from 'react';
import { useStore, AIProvider, AI_PROVIDERS } from '../store';

export const WelcomeWizard: React.FC = () => {
  const { setIsFirstRun, selectFace, sessions, updateSession } = useStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedSessionIndex, setSelectedSessionIndex] = useState<number | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('claude');
  const [projectDescription, setProjectDescription] = useState('');

  const handleSessionSelect = (index: number) => {
    setSelectedSessionIndex(index);
    selectFace(index);
  };

  const handleProviderSelect = (providerId: AIProvider) => {
    setSelectedProvider(providerId);
  };

  const handleComplete = () => {
    // Update the selected session with the chosen AI provider and project description
    if (selectedSessionIndex !== null) {
      updateSession(selectedSessionIndex, {
        aiProvider: selectedProvider,
        notes: projectDescription || undefined,
      });
    }
    setIsFirstRun(false);
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    setIsFirstRun(false);
  };

  const canProceed = () => {
    if (currentStep === 1 && selectedSessionIndex === null) return false;
    // Step 2 (describe project) is optional - always can proceed
    if (currentStep === 3 && !selectedProvider) return false;
    return true;
  };

  return (
    <div className="wizard-overlay">
      <div className="wizard-modal">
        {/* Header */}
        <div className="wizard-header">
          <div className="wizard-logo">
            <span className="wizard-icon">◇</span>
            <span className="wizard-title">flowrider</span>
          </div>
          <button className="wizard-skip" onClick={handleSkip}>
            Skip Tour
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="wizard-progress">
          {[0, 1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`progress-dot ${currentStep >= step ? 'active' : ''} ${
                currentStep === step ? 'current' : ''
              }`}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="wizard-content">
          {currentStep === 0 && (
            <div className="wizard-step step-welcome">
              <div className="step-icon geo-icon">◇</div>
              <h1 className="step-title">Welcome to Flowrider</h1>
              <p className="step-subtitle">Run 20 AI sessions in parallel</p>
              <div className="welcome-features">
                <div className="feature-item">
                  <span className="feature-icon geo-icon">⬡</span>
                  <div>
                    <h3>Parallel AI Sessions</h3>
                    <p>Work on 20 different tasks simultaneously</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon geo-icon">△</span>
                  <div>
                    <h3>Multiple AI Providers</h3>
                    <p>Choose from Claude, GPT-4, Gemini, or local models</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon geo-icon">◈</span>
                  <div>
                    <h3>Cost Tracking</h3>
                    <p>Monitor your AI usage and optimize spending</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="wizard-step step-session">
              <div className="step-icon geo-icon">⬢</div>
              <h1 className="step-title">Pick Your First Session</h1>
              <p className="step-subtitle">Click any numbered slot (1-20)</p>
              <div className="session-grid">
                {sessions.slice(0, 20).map((session, idx) => (
                  <button
                    key={idx}
                    className={`session-slot ${
                      selectedSessionIndex === idx ? 'selected' : ''
                    } ${session.status !== 'empty' ? 'occupied' : ''}`}
                    onClick={() => handleSessionSelect(idx)}
                    disabled={session.status !== 'empty'}
                  >
                    <span className="slot-number">{idx + 1}</span>
                    {session.status !== 'empty' && (
                      <span className="slot-status">Active</span>
                    )}
                  </button>
                ))}
              </div>
              {selectedSessionIndex !== null && (
                <div className="selection-feedback">
                  Session {selectedSessionIndex + 1} selected
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="wizard-step step-describe">
              <div className="step-icon geo-icon">▣</div>
              <h1 className="step-title">Describe Your Project</h1>
              <p className="step-subtitle">Help Claude understand what you're building</p>
              <div className="describe-form">
                <textarea
                  className="project-description-input"
                  placeholder="What are you building? What tech stack? Any important context Claude should know?"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  rows={5}
                />
                <div className="describe-tips">
                  <p className="tip-header">Good descriptions include:</p>
                  <ul>
                    <li>Project type (web app, CLI tool, API, etc.)</li>
                    <li>Tech stack (React, Node, Python, etc.)</li>
                    <li>Current goal or task you're working on</li>
                  </ul>
                </div>
              </div>
              <div className="skip-hint">
                This step is optional - you can always update it later
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="wizard-step step-ai">
              <div className="step-icon geo-icon">⬡</div>
              <h1 className="step-title">Choose Your AI</h1>
              <p className="step-subtitle">Claude, GPT-4, or local models</p>
              <div className="ai-providers-grid">
                {AI_PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    className={`ai-provider-card ${
                      selectedProvider === provider.id ? 'selected' : ''
                    }`}
                    onClick={() => handleProviderSelect(provider.id)}
                  >
                    <div className="provider-header">
                      <span className="provider-name">{provider.name}</span>
                      {provider.isLocal && (
                        <span className="provider-badge local">FREE</span>
                      )}
                      {!provider.isLocal && (
                        <span className="provider-badge cloud">
                          ${provider.costPerMToken}/M tokens
                        </span>
                      )}
                    </div>
                    <p className="provider-description">{provider.description}</p>
                    <div className="provider-models">
                      {provider.models.slice(0, 3).map((model) => (
                        <span key={model} className="model-tag">
                          {model}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="wizard-step step-ready">
              <div className="confetti-container">
                <div className="confetti geo-confetti">◇</div>
                <div className="confetti geo-confetti">△</div>
                <div className="confetti geo-confetti">⬡</div>
                <div className="confetti geo-confetti">◈</div>
                <div className="confetti geo-confetti">⬢</div>
                <div className="confetti geo-confetti">▣</div>
              </div>
              <div className="step-icon geo-icon success">◇</div>
              <h1 className="step-title">You're Ready!</h1>
              <p className="step-subtitle">Start building in parallel</p>
              <div className="ready-summary">
                <div className="summary-item">
                  <span className="summary-label">Selected Session:</span>
                  <span className="summary-value">
                    #{selectedSessionIndex !== null ? selectedSessionIndex + 1 : '-'}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">AI Provider:</span>
                  <span className="summary-value">
                    {AI_PROVIDERS.find((p) => p.id === selectedProvider)?.name || '-'}
                  </span>
                </div>
              </div>
              <div className="next-steps">
                <h3>Next Steps:</h3>
                <ul>
                  <li>Create your first session from the terminal view</li>
                  <li>Explore the Dashboard to track costs and usage</li>
                  <li>Use Projects to organize your work</li>
                  <li>Press Cmd+/ to search sessions</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="wizard-footer">
          <button
            className="wizard-btn wizard-btn-secondary"
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            Back
          </button>
          <div className="wizard-step-counter">
            Step {currentStep + 1} of 5
          </div>
          <button
            className="wizard-btn wizard-btn-primary"
            onClick={handleNext}
            disabled={!canProceed()}
          >
            {currentStep === 4 ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};
