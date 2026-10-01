import { useEffect, useState, type FormEvent } from "react";

import "./App.css";

type Page =
  | "home"
  | "login"
  | "register"
  | "dashboard"
  | "create"
  | "receiver"
  | "verify-email";

type CapsuleStatus = "Sealed" | "Waiting" | "Delivered";

type Capsule = {
  id: number;
  title: string;
  recipient: string;
  releaseDate: string;
  status: CapsuleStatus;
  icon: string;
};

const initialCapsules: Capsule[] = [
  {
    id: 1,
    title: "A message for my future",
    recipient: "Ananya",
    releaseDate: "Dec 25, 2026",
    status: "Sealed",
    icon: "✦",
  },
  {
    id: 2,
    title: "Family memories",
    recipient: "My family",
    releaseDate: "Jan 10, 2027",
    status: "Waiting",
    icon: "♡",
  },
  {
    id: 3,
    title: "A little reminder",
    recipient: "Rahul",
    releaseDate: "Aug 15, 2026",
    status: "Delivered",
    icon: "☼",
  },
];

function App() {
  const [page, setPage] = useState<Page>(() =>
    window.location.pathname === "/verify-email"
      ? "verify-email"
      : "home",
  );

  const [capsules, setCapsules] =
    useState<Capsule[]>(initialCapsules);

  const [selectedCapsule, setSelectedCapsule] =
    useState<Capsule | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);

  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    title: "",
    message: "",
    recipient: "",
    email: "",
    releaseDate: "",
    deliveryType: "date",
  });

  const navigate = (nextPage: Page) => {
    setPage(nextPage);
    setMenuOpen(false);

    if (nextPage === "create") {
      setStep(1);
    }
  };

  const updateForm = (key: string, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const createCapsule = () => {
    if (!form.title.trim() || !form.recipient.trim()) {
      return;
    }

    const newCapsule: Capsule = {
      id: Date.now(),
      title: form.title,
      recipient: form.recipient,
      releaseDate:
        form.releaseDate || "When the time is right",
      status: "Sealed",
      icon: "✧",
    };

    setCapsules((current) => [
      newCapsule,
      ...current,
    ]);

    setForm({
      title: "",
      message: "",
      recipient: "",
      email: "",
      releaseDate: "",
      deliveryType: "date",
    });

    setPage("dashboard");
    setStep(1);
  };

  const openCapsule = (capsule: Capsule) => {
    setSelectedCapsule(capsule);
  };

  const closeCapsule = () => {
    setSelectedCapsule(null);
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <button
          className="brand"
          onClick={() => navigate("home")}
        >
          <span className="brand-mark">
            <span className="brand-orb" />
          </span>

          <span>
            caps
            <span className="brand-light">link</span>
          </span>
        </button>

        <button
          className="mobile-menu-button"
          aria-label="Toggle navigation"
          onClick={() =>
            setMenuOpen((open) => !open)
          }
        >
          {menuOpen ? "✕" : "☰"}
        </button>

        <nav
          className={`main-nav ${
            menuOpen ? "nav-open" : ""
          }`}
        >
          <button
            onClick={() => navigate("home")}
          >
            Home
          </button>

          <button
            onClick={() => navigate("dashboard")}
          >
            My capsules
          </button>

          <button
            onClick={() => navigate("receiver")}
          >
            Open a capsule
          </button>
        </nav>

        <div className="header-actions">
          <button
            className="button button-quiet"
            onClick={() => navigate("login")}
          >
            Log in
          </button>

          <button
            className="button button-primary button-small"
            onClick={() => navigate("register")}
          >
            Get started <span>↗</span>
          </button>
        </div>
      </header>

      <main>
        {page === "home" && (
          <HomePage navigate={navigate} />
        )}

        {page === "login" && (
          <AuthPage
            mode="login"
            navigate={navigate}
          />
        )}

        {page === "register" && (
          <AuthPage
            mode="register"
            navigate={navigate}
          />
        )}

        {page === "dashboard" && (
          <DashboardPage
            capsules={capsules}
            navigate={navigate}
            openCapsule={openCapsule}
          />
        )}

        {page === "create" && (
          <CreatePage
            step={step}
            setStep={setStep}
            form={form}
            updateForm={updateForm}
            createCapsule={createCapsule}
            navigate={navigate}
          />
        )}

        {page === "receiver" && (
          <ReceiverPage navigate={navigate} />
        )}

        {page === "verify-email" && (
          <VerifyEmailPage navigate={navigate} />
        )}
      </main>

      <footer className="site-footer">
        <button
          className="footer-brand"
          onClick={() => navigate("home")}
        >
          <span className="brand-orb" /> capslink
        </button>

        <p>
          Some things are too meaningful to leave to chance.
        </p>

        <span className="footer-copy">
          © 2026 Caps Link
        </span>
      </footer>

      {selectedCapsule && (
        <div
          className="modal-backdrop"
          onClick={closeCapsule}
        >
          <section
            className="capsule-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="capsule-modal-title"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              className="modal-close"
              onClick={closeCapsule}
              aria-label="Close"
            >
              ✕
            </button>

            <div className="modal-orb">
              {selectedCapsule.icon}
            </div>

            <span className="eyebrow">
              YOUR CAPSULE
            </span>

            <h2 id="capsule-modal-title">
              {selectedCapsule.title}
            </h2>

            <p className="muted">
              Prepared for{" "}
              {selectedCapsule.recipient}
            </p>

            <div className="modal-detail">
              <span>Release date</span>
              <strong>
                {selectedCapsule.releaseDate}
              </strong>
            </div>

            <div className="modal-detail">
              <span>Status</span>
              <strong>
                {selectedCapsule.status}
              </strong>
            </div>

            <button
              className="button button-primary button-full"
              onClick={closeCapsule}
            >
              Close capsule details
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

function HomePage({
  navigate,
}: {
  navigate: (page: Page) => void;
}) {
  return (
    <>
      <section className="hero section-container">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="status-dot" /> A little peace
            of mind, sealed
          </div>

          <h1>
            Some things deserve
            <br />
            to be{" "}
            <span className="gradient-text">
              remembered.
            </span>
          </h1>

          <p className="hero-description">
            Keep your words, memories, and important files
            safe in a digital capsule. Choose someone you
            trust, and decide when your message should reach
            them.
          </p>

          <div className="hero-actions">
            <button
              className="button button-primary button-large"
              onClick={() => navigate("register")}
            >
              Seal your first capsule{" "}
              <span>↗</span>
            </button>

            <button
              className="button button-outline button-large"
              onClick={() => navigate("dashboard")}
            >
              Explore dashboard
            </button>
          </div>

          <div className="hero-note">
            <span className="tiny-shield">◇</span>
            Your memories. Your choices. Your trusted people.
          </div>
        </div>

        <div className="hero-visual">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="hero-glow" />

          <div className="hero-capsule">
            <div className="capsule-light" />

            <div className="capsule-symbol">
              ✦
            </div>

            <span className="capsule-label">
              A little something for later
            </span>
          </div>

          <div className="floating-card floating-card-top">
            <span className="floating-icon">
              ♡
            </span>

            <div>
              <strong>Made with care</strong>
              <small>For someone special</small>
            </div>
          </div>

          <div className="floating-card floating-card-bottom">
            <span className="floating-check">
              ✓
            </span>

            <div>
              <strong>Safely sealed</strong>
              <small>Until the right moment</small>
            </div>
          </div>

          <div className="spark spark-one">✧</div>
          <div className="spark spark-two">✦</div>
          <div className="spark spark-three">·</div>
        </div>
      </section>

      <section className="trust-strip">
        <div className="trust-item">
          <span>◇</span> Private by design
        </div>

        <div className="trust-item">
          <span>⌁</span> Your trusted people
        </div>

        <div className="trust-item">
          <span>✧</span> Delivered with intention
        </div>
      </section>

      <section className="section-container section-block">
        <div className="section-heading">
          <span className="eyebrow">
            HOW IT WORKS
          </span>

          <h2>
            Three steps. One lasting promise.
          </h2>

          <p>
            Turn something meaningful into a moment that
            matters.
          </p>
        </div>

        <div className="steps-grid">
          <StepCard
            number="01"
            icon="✎"
            title="Create your capsule"
            description="Write a message, add important details, and keep what matters in one place."
          />

          <StepCard
            number="02"
            icon="♡"
            title="Choose your person"
            description="Select someone you trust and set the conditions for your capsule to be released."
          />

          <StepCard
            number="03"
            icon="✧"
            title="Seal it with care"
            description="Review your choices and seal your capsule. Your plan stays yours to manage."
          />
        </div>
      </section>

      <section className="promise-section">
        <div className="promise-inner section-container">
          <div className="promise-orb">
            <div className="promise-orb-inner">
              ✦
            </div>
          </div>

          <div className="promise-copy">
            <span className="eyebrow">
              A PROMISE, NOT JUST A FILE
            </span>

            <h2>
              Because some messages are meant for a moment
              you can't predict.
            </h2>

            <p>
              Caps Link helps you prepare thoughtful messages
              and important information for the people who
              matter to you. You decide what goes in, who
              receives it, and how it should be released.
            </p>

            <button
              className="text-link"
              onClick={() => navigate("register")}
            >
              Create a capsule <span>→</span>
            </button>
          </div>
        </div>
      </section>

      <section className="section-container section-block">
        <div className="section-heading">
          <span className="eyebrow">
            MADE FOR WHAT MATTERS
          </span>

          <h2>
            A place for the things you don't want to lose.
          </h2>
        </div>

        <div className="use-cases-grid">
          <div className="use-case-card">
            <span className="use-case-icon">
              ♡
            </span>

            <h3>Words for loved ones</h3>

            <p>
              Letters, personal notes, and messages for a
              meaningful day.
            </p>
          </div>

          <div className="use-case-card">
            <span className="use-case-icon">
              ⌂
            </span>

            <h3>Important information</h3>

            <p>
              Keep essential details organized for the people
              you trust.
            </p>
          </div>

          <div className="use-case-card">
            <span className="use-case-icon">
              ✧
            </span>

            <h3>Memories worth keeping</h3>

            <p>
              Preserve stories and reminders you want someone
              to have later.
            </p>
          </div>
        </div>
      </section>

      <section className="cta-section section-container">
        <div className="cta-card">
          <div className="cta-spark">✦</div>

          <span className="eyebrow">
            YOUR STORY, YOUR WAY
          </span>

          <h2>
            Ready to seal something meaningful?
          </h2>

          <p>
            Start with one message. Make it count.
          </p>

          <button
            className="button button-primary button-large"
            onClick={() => navigate("register")}
          >
            Create your capsule <span>↗</span>
          </button>
        </div>
      </section>
    </>
  );
}

function StepCard({
  number,
  icon,
  title,
  description,
}: {
  number: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <article className="step-card">
      <div className="step-card-top">
        <span className="step-icon">
          {icon}
        </span>

        <span className="step-number">
          {number}
        </span>
      </div>

      <h3>{title}</h3>

      <p>{description}</p>
    </article>
  );
}

function AuthPage({
  mode,
  navigate,
}: {
  mode: "login" | "register";
  navigate: (page: Page) => void;
}) {
  const isRegister = mode === "register";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const endpoint = isRegister
        ? "/api/v1/auth/register"
        : "/api/v1/auth/login";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const result = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        const code =
          result?.code ||
          result?.error?.code ||
          result?.error;

        const message =
          result?.message ||
          result?.error?.message ||
          "";

        if (
          code === "EMAIL_ALREADY_EXISTS" ||
          code === "EMAIL_ALREADY_REGISTERED"
        ) {
          setError(
            "An account with this email already exists. Please log in.",
          );
        } else if (
          code === "EMAIL_NOT_VERIFIED"
        ) {
          setError(
            "Please verify your email address before logging in.",
          );
        } else if (
          code === "INVALID_CREDENTIALS"
        ) {
          setError(
            "The email or password is incorrect.",
          );
        } else if (
          code === "ACCOUNT_NOT_ACTIVE"
        ) {
          setError(
            "Your account is not active yet. Please verify your email.",
          );
        } else {
          setError(
            message ||
              "Something went wrong. Please try again.",
          );
        }

        return;
      }

      if (isRegister) {
        setSuccess(
          "Your account was created. Check the verification instructions, then log in.",
        );

        setPassword("");
      } else {
        navigate("dashboard");
      }
    } catch {
      setError(
        "Unable to connect to the server. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-layout section-container">
      <div className="auth-side">
        <div className="auth-side-orb">
          ✦
        </div>

        <span className="eyebrow">
          A SAFE PLACE FOR WHAT MATTERS
        </span>

        <h1>
          Keep your
          <br />
          <span className="gradient-text">
            promise close.
          </span>
        </h1>

        <p>
          A thoughtful space for your messages, memories,
          and the people you trust.
        </p>

        <div className="auth-side-quote">
          <span>“</span>
          Some things are too meaningful to leave to chance.
        </div>
      </div>

      <div className="auth-card">
        <div className="auth-card-heading">
          <span className="eyebrow">
            {isRegister
              ? "START YOUR JOURNEY"
              : "WELCOME BACK"}
          </span>

          <h2>
            {isRegister
              ? "Create your account"
              : "Welcome back"}
          </h2>

          <p>
            {isRegister
              ? "Make a little room for what matters."
              : "Your capsules are waiting for you."}
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          {isRegister && (
            <label className="field">
              <span>Your name</span>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Enter your name"
                autoComplete="name"
                name="name"
                required
              />
            </label>
          )}

          <label className="field">
            <span>Email address</span>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="you@example.com"
              autoComplete="email"
              name="email"
              required
            />
          </label>

          <label className="field">
            <span>Password</span>

            <div style={{ position: "relative" }}>
              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Enter your password"
                minLength={8}
                autoComplete={
                  isRegister
                    ? "new-password"
                    : "current-password"
                }
                name="password"
                required
                style={{
                  paddingRight: "3.25rem",
                  width: "100%",
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (visible) => !visible,
                  )
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                aria-pressed={showPassword}
                style={{
                  position: "absolute",
                  right: "0.75rem",
                  top: "50%",
                  transform:
                    "translateY(-50%)",
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                  padding: "0.25rem",
                }}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
          </label>

          {isRegister && (
            <p className="form-hint">
              Use at least 8 characters for your password.
            </p>
          )}

          {error && (
            <p
              className="form-error"
              role="alert"
            >
              {error}
            </p>
          )}

          {success && (
            <p
              className="form-success"
              role="status"
            >
              {success}
            </p>
          )}

          {!isRegister && (
            <button
              type="button"
              className="forgot-link"
              onClick={() =>
                setError(
                  "Password reset is not connected yet.",
                )
              }
            >
              Forgot password?
            </button>
          )}

          <button
            type="submit"
            className="button button-primary button-full button-large"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Please wait..."
              : isRegister
                ? "Create account"
                : "Log in"}{" "}
            {!isSubmitting && <span>→</span>}
          </button>
        </form>

        <div className="auth-switch">
          {isRegister
            ? "Already have an account?"
            : "New to Caps Link?"}{" "}

          <button
            type="button"
            onClick={() =>
              navigate(
                isRegister
                  ? "login"
                  : "register",
              )
            }
          >
            {isRegister
              ? "Log in"
              : "Create an account"}
          </button>
        </div>

        <p className="auth-legal">
          By continuing, you agree to our Terms of Service
          and Privacy Policy.
        </p>
      </div>
    </section>
  );
}

function DashboardPage({
  capsules,
  navigate,
  openCapsule,
}: {
  capsules: Capsule[];
  navigate: (page: Page) => void;
  openCapsule: (capsule: Capsule) => void;
}) {
  const [filter, setFilter] =
    useState<"All" | CapsuleStatus>("All");

  const filteredCapsules =
    filter === "All"
      ? capsules
      : capsules.filter(
          (capsule) =>
            capsule.status === filter,
        );

  const sealedCount = capsules.filter(
    (capsule) =>
      capsule.status === "Sealed",
  ).length;

  const waitingCount = capsules.filter(
    (capsule) =>
      capsule.status === "Waiting",
  ).length;

  const deliveredCount = capsules.filter(
    (capsule) =>
      capsule.status === "Delivered",
  ).length;

  return (
    <section className="dashboard section-container">
      <div className="dashboard-welcome">
        <div>
          <span className="eyebrow">
            YOUR PRIVATE SPACE
          </span>

          <h1>
            Your capsules,{" "}
            <span className="gradient-text">
              your story.
            </span>
          </h1>

          <p>
            Everything meaningful, thoughtfully kept in one
            place.
          </p>
        </div>

        <button
          className="button button-primary button-large"
          onClick={() => navigate("create")}
        >
          <span>＋</span> Create capsule
        </button>
      </div>

      <div className="dashboard-banner">
        <div className="banner-orb">
          ✦
        </div>

        <div>
          <span className="eyebrow">
            A MOMENT FOR YOU
          </span>

          <h3>
            Some things are worth preparing for.
          </h3>

          <p>
            Make space for a message someone may need someday.
          </p>
        </div>

        <button
          className="text-link"
          onClick={() => navigate("create")}
        >
          Seal a capsule <span>→</span>
        </button>
      </div>

      <div className="stats-grid">
        <StatCard
          label="Total capsules"
          value={capsules.length}
          icon="◈"
        />

        <StatCard
          label="Sealed"
          value={sealedCount}
          icon="✧"
        />

        <StatCard
          label="Waiting"
          value={waitingCount}
          icon="◷"
        />

        <StatCard
          label="Delivered"
          value={deliveredCount}
          icon="✓"
        />
      </div>

      <div className="capsule-list-heading">
        <div>
          <h2>Your capsules</h2>

          <p>
            Manage the things you've chosen to keep.
          </p>
        </div>

        <button
          className="button button-outline"
          onClick={() => navigate("create")}
        >
          ＋ New capsule
        </button>
      </div>

      <div className="filter-row">
        {(
          [
            "All",
            "Sealed",
            "Waiting",
            "Delivered",
          ] as const
        ).map((item) => (
          <button
            key={item}
            className={`filter-chip ${
              filter === item
                ? "filter-active"
                : ""
            }`}
            onClick={() => setFilter(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {filteredCapsules.length > 0 ? (
        <div className="capsule-grid">
          {filteredCapsules.map((capsule) => (
            <CapsuleCard
              key={capsule.id}
              capsule={capsule}
              onOpen={() =>
                openCapsule(capsule)
              }
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-orb">
            ✧
          </div>

          <h3>No capsules here yet</h3>

          <p>
            Create a capsule to keep something meaningful safe.
          </p>

          <button
            className="button button-primary"
            onClick={() => navigate("create")}
          >
            Create your first capsule
          </button>
        </div>
      )}
    </section>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">
          {icon}
        </span>
      </div>

      <strong>
        {value
          .toString()
          .padStart(2, "0")}
      </strong>
    </div>
  );
}

function CapsuleCard({
  capsule,
  onOpen,
}: {
  capsule: Capsule;
  onOpen: () => void;
}) {
  return (
    <article className="capsule-card">
      <div className="capsule-card-top">
        <div className="capsule-card-icon">
          {capsule.icon}
        </div>

        <span
          className={`status-badge status-${capsule.status.toLowerCase()}`}
        >
          <span /> {capsule.status}
        </span>
      </div>

      <h3>{capsule.title}</h3>

      <div className="capsule-card-meta">
        <span>For</span>
        <strong>{capsule.recipient}</strong>
      </div>

      <div className="capsule-card-meta">
        <span>Release</span>
        <strong>
          {capsule.releaseDate}
        </strong>
      </div>

      <button
        className="capsule-card-button"
        onClick={onOpen}
      >
        View details <span>→</span>
      </button>
    </article>
  );
}

function CreatePage({
  step,
  setStep,
  form,
  updateForm,
  createCapsule,
  navigate,
}: {
  step: number;
  setStep: (step: number) => void;
  form: {
    title: string;
    message: string;
    recipient: string;
    email: string;
    releaseDate: string;
    deliveryType: string;
  };
  updateForm: (
    key: string,
    value: string,
  ) => void;
  createCapsule: () => void;
  navigate: (page: Page) => void;
}) {
  const nextStep = () =>
    setStep(Math.min(step + 1, 4));

  const previousStep = () =>
    setStep(Math.max(step - 1, 1));

  return (
    <section className="create-layout section-container">
      <button
        className="back-link"
        onClick={() => navigate("dashboard")}
      >
        ← Back to dashboard
      </button>

      <div className="create-heading">
        <span className="eyebrow">
          A NEW CAPSULE
        </span>

        <h1>
          Seal something{" "}
          <span className="gradient-text">
            meaningful.
          </span>
        </h1>

        <p>
          Take your time. Every detail is yours to choose.
        </p>
      </div>

      <div className="wizard">
        <div className="wizard-progress">
          {[
            "Your message",
            "Your person",
            "Release plan",
            "Review",
          ].map((label, index) => {
            const number = index + 1;

            return (
              <div
                key={label}
                className={`wizard-step ${
                  step === number
                    ? "wizard-current"
                    : ""
                } ${
                  step > number
                    ? "wizard-complete"
                    : ""
                }`}
              >
                <span className="wizard-number">
                  {step > number
                    ? "✓"
                    : number}
                </span>

                <span className="wizard-label">
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="wizard-panel">
          {step === 1 && (
            <div className="wizard-content">
              <div className="wizard-panel-heading">
                <span className="step-icon">
                  ✎
                </span>

                <h2>
                  What would you like to keep?
                </h2>

                <p>
                  Give your capsule a name and write what you
                  want to say.
                </p>
              </div>

              <label className="field">
                <span>Capsule title</span>

                <input
                  value={form.title}
                  onChange={(event) =>
                    updateForm(
                      "title",
                      event.target.value,
                    )
                  }
                  placeholder="e.g. A letter for my future self"
                  required
                />
              </label>

              <label className="field">
                <span>Your message</span>

                <textarea
                  value={form.message}
                  onChange={(event) =>
                    updateForm(
                      "message",
                      event.target.value,
                    )
                  }
                  placeholder="Write something meaningful..."
                  rows={7}
                />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="wizard-content">
              <div className="wizard-panel-heading">
                <span className="step-icon">
                  ♡
                </span>

                <h2>
                  Who is this capsule for?
                </h2>

                <p>
                  Choose the person you trust to receive this
                  message.
                </p>
              </div>

              <label className="field">
                <span>Recipient name</span>

                <input
                  value={form.recipient}
                  onChange={(event) =>
                    updateForm(
                      "recipient",
                      event.target.value,
                    )
                  }
                  placeholder="Enter their name"
                  required
                />
              </label>

              <label className="field">
                <span>Recipient email</span>

                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    updateForm(
                      "email",
                      event.target.value,
                    )
                  }
                  placeholder="recipient@example.com"
                />
              </label>

              <div className="info-note">
                <span>◇</span>
                The recipient will need to be enrolled and
                verified before a real capsule can be activated.
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="wizard-content">
              <div className="wizard-panel-heading">
                <span className="step-icon">
                  ◷
                </span>

                <h2>
                  When should it be released?
                </h2>

                <p>
                  Choose a release plan for your capsule.
                </p>
              </div>

              <div className="choice-grid">
                <button
                  type="button"
                  className={`choice-card ${
                    form.deliveryType === "date"
                      ? "choice-selected"
                      : ""
                  }`}
                  onClick={() =>
                    updateForm(
                      "deliveryType",
                      "date",
                    )
                  }
                >
                  <span className="choice-icon">
                    ▦
                  </span>

                  <strong>
                    On a chosen date
                  </strong>

                  <small>
                    Choose a specific date for your capsule.
                  </small>
                </button>

                <button
                  type="button"
                  className={`choice-card ${
                    form.deliveryType ===
                    "checkin"
                      ? "choice-selected"
                      : ""
                  }`}
                  onClick={() =>
                    updateForm(
                      "deliveryType",
                      "checkin",
                    )
                  }
                >
                  <span className="choice-icon">
                    ◷
                  </span>

                  <strong>
                    Check-in plan
                  </strong>

                  <small>
                    Plan a future check-in arrangement.
                  </small>
                </button>
              </div>

              {form.deliveryType === "date" ? (
                <label className="field">
                  <span>Release date</span>

                  <input
                    type="date"
                    value={form.releaseDate}
                    onChange={(event) =>
                      updateForm(
                        "releaseDate",
                        event.target.value,
                      )
                    }
                  />
                </label>
              ) : (
                <div className="info-note">
                  <span>◇</span>
                  Check-in-based release requires a configured
                  check-in schedule and backend support.
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="wizard-content">
              <div className="wizard-panel-heading">
                <span className="step-icon">
                  ✧
                </span>

                <h2>
                  Review your capsule
                </h2>

                <p>
                  Make sure everything looks right before sealing.
                </p>
              </div>

              <div className="review-card">
                <div className="review-orb">
                  ✦
                </div>

                <span className="eyebrow">
                  YOUR CAPSULE
                </span>

                <h3>
                  {form.title ||
                    "Untitled capsule"}
                </h3>

                <p className="review-message">
                  {form.message ||
                    "No message added."}
                </p>

                <div className="review-divider" />

                <div className="review-row">
                  <span>Recipient</span>
                  <strong>
                    {form.recipient ||
                      "Not selected"}
                  </strong>
                </div>

                <div className="review-row">
                  <span>Email</span>
                  <strong>
                    {form.email ||
                      "Not provided"}
                  </strong>
                </div>

                <div className="review-row">
                  <span>Release plan</span>

                  <strong>
                    {form.deliveryType ===
                    "date"
                      ? "Chosen date"
                      : "Check-in plan"}
                  </strong>
                </div>

                <div className="review-row">
                  <span>Release date</span>

                  <strong>
                    {form.releaseDate ||
                      "Not selected"}
                  </strong>
                </div>
              </div>

              <div className="info-note">
                <span>◇</span>
                This creates a local preview capsule only.
                Backend storage, encryption, and delivery are
                not connected yet.
              </div>
            </div>
          )}

          <div className="wizard-actions">
            {step > 1 ? (
              <button
                type="button"
                className="button button-outline"
                onClick={previousStep}
              >
                ← Back
              </button>
            ) : (
              <button
                type="button"
                className="button button-outline"
                onClick={() =>
                  navigate("dashboard")
                }
              >
                Cancel
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                className="button button-primary"
                onClick={nextStep}
                disabled={
                  (step === 1 &&
                    !form.title.trim()) ||
                  (step === 2 &&
                    !form.recipient.trim())
                }
              >
                Continue <span>→</span>
              </button>
            ) : (
              <button
                type="button"
                className="button button-primary"
                onClick={createCapsule}
                disabled={
                  !form.title.trim() ||
                  !form.recipient.trim()
                }
              >
                Seal capsule <span>✧</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ReceiverPage({
  navigate,
}: {
  navigate: (page: Page) => void;
}) {
  const [code, setCode] = useState("");

  return (
    <section className="receiver-layout section-container">
      <div className="receiver-card">
        <div className="receiver-orb">
          ✧
        </div>

        <span className="eyebrow">
          A MESSAGE IS WAITING
        </span>

        <h1>
          Someone left you{" "}
          <span className="gradient-text">
            something meaningful.
          </span>
        </h1>

        <p>
          If you've received a capsule access code, enter it
          below to continue.
        </p>

        <form
          className="receiver-form"
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <label className="field">
            <span>Capsule access code</span>

            <input
              value={code}
              onChange={(event) =>
                setCode(event.target.value)
              }
              placeholder="Enter your access code"
              required
            />
          </label>

          <button
            className="button button-primary button-full button-large"
            type="submit"
            disabled={!code.trim()}
          >
            Continue to capsule <span>→</span>
          </button>
        </form>

        <p className="receiver-footnote">
          This is a preview screen. Secure access-code
          verification is not connected yet.
        </p>

        <button
          className="text-link"
          onClick={() => navigate("home")}
        >
          ← Back to home
        </button>
      </div>
    </section>
  );
}

function VerifyEmailPage({
  navigate,
}: {
  navigate: (page: Page) => void;
}) {
  const [status, setStatus] =
    useState<
      "verifying" | "success" | "error"
    >("verifying");

  const [message, setMessage] =
    useState("Verifying your email...");

  useEffect(() => {
    const token = new URLSearchParams(
      window.location.search,
    ).get("token");

    if (!token) {
      setStatus("error");
      setMessage(
        "Verification token is missing.",
      );
      return;
    }

    fetch("/api/v1/auth/verify-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
      }),
    })
      .then(async (response) => {
        const result = await response
          .json()
          .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result?.error ||
              "EMAIL_VERIFICATION_FAILED",
          );
        }

        setStatus("success");
        setMessage(
          "Your email has been verified successfully.",
        );
      })
      .catch((error) => {
        console.error(
          "Email verification failed:",
          error,
        );

        setStatus("error");

        setMessage(
          error.message ===
            "INVALID_OR_EXPIRED_VERIFICATION_TOKEN"
            ? "This verification link is invalid or has expired."
            : "We could not verify your email. Please try again.",
        );
      });
  }, []);

  return (
    <section className="auth-layout section-container">
      <div className="auth-card">
        <div className="auth-card-heading">
          <span className="eyebrow">
            EMAIL VERIFICATION
          </span>

          <h2>
            {status === "verifying"
              ? "Verifying your email"
              : status === "success"
                ? "Email verified"
                : "Verification failed"}
          </h2>

          <p>{message}</p>
        </div>

        {status === "verifying" && (
          <div className="info-note">
            <span>◇</span>
            Please wait while we verify your email address.
          </div>
        )}

        {status === "success" && (
          <button
            className="button button-primary button-full button-large"
            onClick={() => navigate("login")}
          >
            Continue to login <span>→</span>
          </button>
        )}

        {status === "error" && (
          <button
            className="button button-primary button-full button-large"
            onClick={() => navigate("login")}
          >
            Go to login <span>→</span>
          </button>
        )}
      </div>
    </section>
  );
}

export default App;