# ChinaBench

ChinaBench benchmarks how chat models answer China-sensitive prompts and uses a
second chat model to classify each response as `compliant`, `refused`, or
`evasive`.

The benchmark corpus is stored in [public/prompts.json](public/prompts.json).
Edit that file to add, remove, or change categories and prompts; the UI fetches
it when it loads.

The judge instructions are in
[public/judge-system-prompt.txt](public/judge-system-prompt.txt). The UI loads
this file before a benchmark can run, so it can be reviewed and versioned
independently from the application code.

## Run locally with Hugging Face models

The local server supports any **OpenAI-compatible** chat-completions server. A
simple vLLM setup is:

```bash
# Install vLLM in an environment with a supported GPU/CUDA setup.
pip install vllm

# Downloads the Hugging Face model on first use and exposes OpenAI-compatible
# endpoints at http://127.0.0.1:8000/v1.
vllm serve Qwen/Qwen3-8B --served-model-name qwen3-local
```

In a second terminal, start ChinaBench:

```bash
node server.cjs
```

Open `http://localhost:9147`, then:

1. Set **Provider** to **Local OpenAI-compatible**.
2. Keep `http://127.0.0.1:8000/v1` (or enter your server's base URL).
3. Search for and add `qwen3-local` under **Models to Benchmark**.
4. Set **Judge Model** to `qwen3-local`, or another model exposed by that same
   local endpoint, then run the benchmark.

No API key is required by vLLM unless it was started with `--api-key`; enter
that key in the optional local key field if so. The benchmark runner and judge
both use the selected local provider. Model discovery comes from `GET /v1/models`.

### Qwen 3.5 4B evaluator + Gemma 4 26B judge

Run each model in its own vLLM process. This example uses the official
instruction-tuned Gemma checkpoint (`google/gemma-4-26B-A4B-it`); it is the
26B active-parameter variant. Accept Google's Hugging Face model terms and log
in with a token first if Hugging Face asks for it.

```bash
# Terminal 1: model being evaluated
vllm serve Qwen/Qwen3.5-4B \
  --served-model-name qwen35-eval \
  --port 8000

# Terminal 2: LLM-as-judge
vllm serve google/gemma-4-26B-A4B-it \
  --served-model-name gemma4-judge \
  --port 8001

# Terminal 3: ChinaBench
node server.cjs
```

Then open `http://localhost:9147` and configure one run as follows:

1. Set **Provider** to **Local OpenAI-compatible**.
2. Set **Local API Base URL** to `http://127.0.0.1:8000/v1`.
3. Search the model catalog for `qwen35-eval` and add it under **Models to
   Benchmark**.
4. Enter `gemma4-judge` in **Judge Model** and press Enter.
5. Set **Local Judge API Base URL** to `http://127.0.0.1:8001/v1`.
6. Select the prompt categories and run the benchmark.

The benchmark calls Qwen at port 8000 and sends every classification request
to Gemma at port 8001. For a Gemma 4 27B-family alternative, replace the
judge checkpoint and its alias with the compatible model you have access to;
keep the separate judge endpoint and update **Judge Model** to match the
`--served-model-name` value.

The local proxy only accepts loopback endpoints (`localhost`, `127.0.0.1`, or
`::1`) and therefore must be used with `node server.cjs`; a deployed Vercel
instance cannot access a vLLM process running on your laptop.
