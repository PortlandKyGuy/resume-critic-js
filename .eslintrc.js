module.exports = {
  env: {
    commonjs: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'airbnb-base'
  ],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  plugins: [
    'fp'
  ],
  rules: {
    'comma-dangle': ['error', 'never'],
    'no-console': 'off',
    'no-use-before-define': ['error', { functions: false }],
    'prefer-destructuring': ['error', { object: true, array: false }],
    'no-param-reassign': ['error', { props: false }],
    'max-len': ['error', { code: 120, ignoreComments: true }],
    'object-curly-newline': ['error', { consistent: true }],
    'arrow-parens': ['error', 'as-needed'],
    'fp/no-mutation': ['warn', {
      commonjs: true,
      allowThis: true,
      exceptions: [
        { property: 'cache' },
        { property: 'validated' }
      ]
    }],
    'fp/no-let': 'warn',
    'fp/no-loops': 'warn',
    'fp/no-delete': 'error',
    'import/no-extraneous-dependencies': ['error', { 
      devDependencies: ['**/*.test.js', 'tests/**/*.js', 'scripts/**/*.js']
    }]
  }
};