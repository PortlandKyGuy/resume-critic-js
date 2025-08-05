# Resume Critic API

A sophisticated resume evaluation API that uses an ensemble of AI critics to provide comprehensive feedback on resumes.

## Configuration

The application uses YAML configuration files located in the `config/` directory:

- `config/default.yaml` - Base configuration for all environments
- `config/development.yaml` - Development-specific overrides
- `config/production.yaml` - Production-specific overrides
- `config/test.yaml` - Test-specific overrides

### Custom Configuration File

You can specify a custom configuration file using the `CONFIG_FILE_PATH` environment variable:

```bash
# Use absolute path
CONFIG_FILE_PATH=/path/to/custom-config.yaml npm start

# Use relative path
CONFIG_FILE_PATH=./my-config.yaml npm start
```

### Configuration Structure

See the [default configuration file](config/default.yaml) for the complete configuration structure and available options.

Key configuration sections include:
- **server** - Port, body size limits, CORS settings
- **llm** - LLM provider settings, temperature, retry configuration
- **critics** - Enabled critics and their weights
- **evaluation** - Evaluation thresholds
- **prompts** - Industry-specific prompt settings
- **audit** - Audit logging configuration
- **logging** - Application logging settings
- **utils** - Utility function configurations (e.g., memoize cache size)

Environment-specific overrides can be found in:
- [Development config](config/development.yaml)
- [Production config](config/production.yaml)
- [Test config](config/test.yaml)

## Installation

```bash
npm install
```

## Running the Application

### Development Mode (with Mock LLM)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

### With Custom Configuration

```bash
CONFIG_FILE_PATH=./my-config.yaml npm start
```

## Testing

```bash
npm test
```

## API Endpoints

### Health Check

- `GET /health` - Returns server health status
- `GET /ready` - Returns server readiness status

### API Versions

- `GET /v1` - Version 1 API endpoints
- `GET /v2` - Version 2 API endpoints (with job-fit awareness)

### Evaluation Endpoints

- `POST /v1/evaluation/evaluate` - Evaluate a resume against a job description
- `POST /v1/evaluation/evaluate-files` - Evaluate resume files
- `POST /v2/evaluation/evaluate` - Enhanced evaluation with job-fit scoring
- `POST /v2/evaluation/evaluate-with-job-fit` - Dedicated job-fit evaluation

## Environment Variables

- `NODE_ENV` - Environment mode (development, production, test)
- `CONFIG_FILE_PATH` - Path to custom configuration file
- `USE_MOCK_LLM` - Use mock LLM provider for development/testing
- `PORT` - Server port (overrides config)
- `LOG_LEVEL` - Logging level (overrides config)