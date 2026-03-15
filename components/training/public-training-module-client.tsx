"use client";

import Link from "next/link";
import { Download, Loader2, PlayCircle, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

type PublicTrainingModuleClientProps = {
  qrToken: string;
  title: string;
  description: string;
  materialMimeType: string;
  materialFileName: string;
};

const CONSENT_STORAGE_PREFIX = "training-public-consent:v1";

function buildConsentStorageKey(qrToken: string) {
  return `${CONSENT_STORAGE_PREFIX}:${qrToken}`;
}

export default function PublicTrainingModuleClient({
  qrToken,
  title,
  description,
  materialMimeType,
  materialFileName,
}: PublicTrainingModuleClientProps) {
  const [isReady, setIsReady] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);

  const materialUrl = `/api/training/public/${qrToken}`;
  const returnTo = `/training/${qrToken}`;
  const isPdf = materialMimeType === "application/pdf";
  const isVideo = materialMimeType.startsWith("video/");
  const legalQuery = { return_to: returnTo };

  useEffect(() => {
    try {
      setHasAccepted(window.localStorage.getItem(buildConsentStorageKey(qrToken)) === "accepted");
    } catch {
      setHasAccepted(false);
    } finally {
      setIsReady(true);
    }
  }, [qrToken]);

  function handleAccept() {
    try {
      window.localStorage.setItem(buildConsentStorageKey(qrToken), "accepted");
    } catch {
      // Continue rendering the material even if storage is unavailable.
    }

    setHasAccepted(true);
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-blue-100/80 bg-white/95 shadow-[0_32px_90px_-48px_rgba(30,64,175,0.16)]">
      <div className="border-b border-blue-100/80 px-6 py-6 md:px-8">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
          Training Material
        </p>
        <h1 className="mt-3 text-[clamp(2rem,4.5vw,3.4rem)] font-semibold text-slate-950 [font-family:var(--font-playfair)]">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{description}</p>
      </div>

      <div className="px-6 py-6 md:px-8">
        {!isReady ? (
          <div className="flex min-h-[18rem] items-center justify-center rounded-[1.5rem] border border-blue-100/80 bg-blue-50/55">
            <Loader2 className="h-6 w-6 animate-spin text-blue-700" />
          </div>
        ) : hasAccepted ? (
          <>
            {isPdf ? (
              <iframe
                src={materialUrl}
                className="h-[75vh] w-full rounded-[1.5rem] border border-blue-100/80 bg-white"
                title={title}
              />
            ) : null}

            {isVideo ? (
              <div className="overflow-hidden rounded-[1.5rem] border border-blue-100/80 bg-slate-950">
                <video
                  className="h-auto w-full"
                  controls
                  preload="metadata"
                  src={materialUrl}
                >
                  Your browser does not support video playback.
                </video>
              </div>
            ) : null}

            {!isPdf && !isVideo ? (
              <div className="rounded-[1.5rem] border border-dashed border-blue-100/80 bg-blue-50/70 px-6 py-10 text-center">
                <PlayCircle className="mx-auto h-10 w-10 text-blue-700" />
                <p className="mt-4 text-sm text-slate-600">
                  This file type opens best in its native app. Use the buttons below to view or
                  download the material.
                </p>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={materialUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-blue-800 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-900"
              >
                <Download className="h-4 w-4" />
                Open material
              </a>
              <a
                href={materialUrl}
                download={materialFileName}
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            </div>
          </>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="rounded-[1.6rem] border border-cyan-100/80 bg-[linear-gradient(180deg,rgba(236,254,255,0.88),rgba(255,255,255,0.98))] p-6 shadow-[0_28px_70px_-46px_rgba(8,145,178,0.16)]">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-800">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <p className="mt-5 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-cyan-800">
                First Access Required
              </p>
              <h2 className="mt-3 text-[clamp(1.6rem,3vw,2.35rem)] font-semibold leading-tight text-slate-950 [font-family:var(--font-playfair)]">
                Review the privacy policy and terms before opening this module
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                This confirmation is saved only for this specific module on this browser, so
                succeeding visits here can open the material immediately.
              </p>

              <div className="mt-6 space-y-4">
                <label className="flex items-start gap-3 rounded-[1.3rem] border border-cyan-100 bg-white/85 px-4 py-4 text-sm leading-7 text-slate-700">
                  <input
                    type="checkbox"
                    checked={privacyChecked}
                    onChange={(event) => setPrivacyChecked(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-zinc-300 text-cyan-700 focus:ring-cyan-600"
                  />
                  <span>
                    I reviewed the{" "}
                    <Link
                      href={{ pathname: "/training/privacy-policy", query: legalQuery }}
                      className="font-semibold text-cyan-800 underline underline-offset-4"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>

                <label className="flex items-start gap-3 rounded-[1.3rem] border border-cyan-100 bg-white/85 px-4 py-4 text-sm leading-7 text-slate-700">
                  <input
                    type="checkbox"
                    checked={termsChecked}
                    onChange={(event) => setTermsChecked(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-zinc-300 text-cyan-700 focus:ring-cyan-600"
                  />
                  <span>
                    I reviewed the{" "}
                    <Link
                      href={{ pathname: "/training/terms-and-conditions", query: legalQuery }}
                      className="font-semibold text-cyan-800 underline underline-offset-4"
                    >
                      Terms and Conditions
                    </Link>
                    .
                  </span>
                </label>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={!privacyChecked || !termsChecked}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-cyan-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  Continue to module
                </button>
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-zinc-200 bg-white/90 p-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.12)]">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Access Notes
              </p>
              <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
                <p>This acknowledgment applies to this module only.</p>
                <p>File: {materialFileName}</p>
                <p>Downloading or viewing the material does not mark compliance automatically.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
