const { 
  tokenize,
  buildAST,
  render,
  createRenderer,
  compileTemplate,
  validateTemplate,
  extractVariables,
  safeRender,
  getValueFromPath,
  parseDefaultValue
} = require('../../../src/prompts/template');

describe('Template Engine', () => {
  describe('parseDefaultValue', () => {
    it('should parse variable with default value', () => {
      const result = parseDefaultValue('name|"Anonymous"');
      expect(result).toEqual({
        path: 'name',
        defaultValue: 'Anonymous'
      });
    });

    it('should handle variables without defaults', () => {
      const result = parseDefaultValue('user.name');
      expect(result).toEqual({
        path: 'user.name',
        defaultValue: undefined
      });
    });

    it('should handle whitespace', () => {
      const result = parseDefaultValue('  name | "Default"  ');
      expect(result).toEqual({
        path: 'name',
        defaultValue: 'Default'
      });
    });
  });

  describe('getValueFromPath', () => {
    const context = {
      user: {
        name: 'John',
        profile: {
          age: 30,
          city: 'NYC'
        }
      },
      items: ['a', 'b', 'c'],
      count: 42,
      active: true
    };

    it('should get simple values', () => {
      expect(getValueFromPath('user', context)).toEqual(context.user);
      expect(getValueFromPath('count', context)).toBe(42);
      expect(getValueFromPath('active', context)).toBe(true);
    });

    it('should get nested values', () => {
      expect(getValueFromPath('user.name', context)).toBe('John');
      expect(getValueFromPath('user.profile.city', context)).toBe('NYC');
    });

    it('should handle default values', () => {
      expect(getValueFromPath('missing|"default"', context)).toBe('default');
      expect(getValueFromPath('user.missing|"fallback"', context)).toBe('fallback');
    });

    it('should return undefined for missing paths without defaults', () => {
      expect(getValueFromPath('missing', context)).toBeUndefined();
      expect(getValueFromPath('user.missing.nested', context)).toBeUndefined();
    });
  });

  describe('tokenize', () => {
    it('should tokenize plain text', () => {
      const tokens = tokenize('Hello World');
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({
        type: 'TEXT',
        value: 'Hello World'
      });
    });

    it('should tokenize variables', () => {
      const tokens = tokenize('Hello {{name}}!');
      expect(tokens).toHaveLength(3);
      expect(tokens[1]).toMatchObject({
        type: 'VARIABLE',
        value: 'name'
      });
    });

    it('should tokenize conditionals', () => {
      const tokens = tokenize('{{#if show}}content{{/if}}');
      expect(tokens).toContainEqual(expect.objectContaining({
        type: 'IF_START',
        value: 'show'
      }));
      expect(tokens).toContainEqual(expect.objectContaining({
        type: 'TEXT',
        value: 'content'
      }));
      expect(tokens).toContainEqual(expect.objectContaining({
        type: 'IF_END'
      }));
    });

    it('should tokenize loops', () => {
      const tokens = tokenize('{{#each items}}{{.}}{{/each}}');
      expect(tokens).toContainEqual(expect.objectContaining({
        type: 'EACH_START',
        value: 'items'
      }));
    });

    it('should tokenize partials', () => {
      const tokens = tokenize('{{> header}}');
      expect(tokens[0]).toMatchObject({
        type: 'PARTIAL',
        value: 'header'
      });
    });

    it('should handle complex templates', () => {
      const template = `
        {{#if user}}
          Hello {{user.name}}!
          {{#each user.roles}}
            - {{name}}: {{level}}
          {{/each}}
        {{/if}}
      `;
      const tokens = tokenize(template);
      
      const types = tokens.map(t => t.type);
      expect(types).toContain('IF_START');
      expect(types).toContain('VARIABLE');
      expect(types).toContain('EACH_START');
      expect(types).toContain('EACH_END');
      expect(types).toContain('IF_END');
    });
  });

  describe('buildAST', () => {
    it('should build AST from simple tokens', () => {
      const tokens = tokenize('Hello {{name}}');
      const ast = buildAST(tokens);
      
      expect(ast).toHaveLength(2);
      expect(ast[0].type).toBe('TEXT');
      expect(ast[1].type).toBe('VARIABLE');
    });

    it('should build nested AST for conditionals', () => {
      const tokens = tokenize('{{#if show}}Hello{{/if}}');
      const ast = buildAST(tokens);
      
      expect(ast).toHaveLength(1);
      expect(ast[0]).toMatchObject({
        type: 'IF_BLOCK',
        condition: 'show',
        trueBranch: expect.arrayContaining([
          expect.objectContaining({ type: 'TEXT', value: 'Hello' })
        ])
      });
    });

    it('should build nested AST for loops', () => {
      const tokens = tokenize('{{#each items}}{{.}}{{/each}}');
      const ast = buildAST(tokens);
      
      expect(ast[0]).toMatchObject({
        type: 'EACH_BLOCK',
        collection: 'items',
        body: expect.arrayContaining([
          expect.objectContaining({ type: 'VARIABLE', value: '.' })
        ])
      });
    });
  });

  describe('render', () => {
    it('should render simple variables', () => {
      expect(render('Hello {{name}}!', { name: 'World' })).toBe('Hello World!');
      expect(render('Count: {{count}}', { count: 42 })).toBe('Count: 42');
    });

    it('should render nested paths', () => {
      const context = { user: { name: 'John', age: 30 } };
      expect(render('{{user.name}} is {{user.age}}', context)).toBe('John is 30');
    });

    it('should render with default values', () => {
      expect(render('Hello {{name|"Guest"}}!', {})).toBe('Hello Guest!');
      expect(render('Hello {{name|"Guest"}}!', { name: 'John' })).toBe('Hello John!');
    });

    it('should render conditionals', () => {
      expect(render('{{#if show}}Visible{{/if}}', { show: true })).toBe('Visible');
      expect(render('{{#if show}}Visible{{/if}}', { show: false })).toBe('');
      expect(render('{{#if count}}Has items{{/if}}', { count: 5 })).toBe('Has items');
      expect(render('{{#if count}}Has items{{/if}}', { count: 0 })).toBe('');
    });

    it('should render loops', () => {
      const template = '{{#each items}}{{.}} {{/each}}';
      expect(render(template, { items: ['a', 'b', 'c'] })).toBe('a b c ');
      expect(render(template, { items: [] })).toBe('');
    });

    it('should provide loop context variables', () => {
      const template = '{{#each items}}{{@index}}:{{.}}{{#if @last}}!{{/if}} {{/each}}';
      expect(render(template, { items: ['a', 'b', 'c'] })).toBe('0:a 1:b 2:c! ');
    });

    it('should render partials', () => {
      const renderer = createRenderer({
        header: '=== {{title}} ==='
      });
      
      const result = renderer('{{> header}}\n{{content}}', {
        title: 'Test',
        content: 'Hello World'
      });
      
      expect(result).toBe('=== Test ===\nHello World');
    });

    it('should handle missing values gracefully', () => {
      expect(render('{{missing}}', {})).toBe('');
      expect(render('{{user.missing}}', { user: {} })).toBe('');
    });

    it('should handle non-array in each', () => {
      expect(render('{{#each items}}{{.}}{{/each}}', { items: 'not-array' })).toBe('');
      expect(render('{{#each items}}{{.}}{{/each}}', {})).toBe('');
    });

    it('should render complex nested template', () => {
      const template = `{{#if user}}
Welcome {{user.name}}!
{{#if user.roles}}
Roles:
{{#each user.roles}}
- {{name}} (level {{level}})
{{/each}}
{{/if}}
{{/if}}`;

      const context = {
        user: {
          name: 'John',
          roles: [
            { name: 'Admin', level: 10 },
            { name: 'Editor', level: 5 }
          ]
        }
      };

      const result = render(template, context);
      expect(result).toContain('Welcome John!');
      expect(result).toContain('Admin (level 10)');
      expect(result).toContain('Editor (level 5)');
    });
  });

  describe('compileTemplate', () => {
    it('should compile and cache templates', () => {
      const template = '{{#each items}}{{.}}{{/each}}';
      
      // First compilation
      const ast1 = compileTemplate(template);
      
      // Second compilation should return same reference (memoized)
      const ast2 = compileTemplate(template);
      
      expect(ast1).toBe(ast2);
    });
  });

  describe('validateTemplate', () => {
    it('should validate correct templates', () => {
      expect(validateTemplate('Hello {{name}}')).toEqual({
        valid: true,
        errors: []
      });
      
      expect(validateTemplate('{{#if test}}{{/if}}')).toEqual({
        valid: true,
        errors: []
      });
    });

    it('should detect unclosed if tags', () => {
      const result = validateTemplate('{{#if test}}content');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('1 unclosed {{#if}} tag(s)');
    });

    it('should detect unclosed each tags', () => {
      const result = validateTemplate('{{#each items}}{{.}}');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('1 unclosed {{#each}} tag(s)');
    });

    it('should detect unmatched closing tags', () => {
      const result = validateTemplate('content {{/if}}');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unmatched {{/if}} tag');
    });
  });

  describe('extractVariables', () => {
    it('should extract variable names', () => {
      const vars = extractVariables('Hello {{name}}, you have {{count}} items');
      expect(vars).toEqual(['name', 'count']);
    });

    it('should extract nested paths', () => {
      const vars = extractVariables('{{user.name}} - {{user.email}}');
      expect(vars).toEqual(['user.name', 'user.email']);
    });

    it('should extract from conditionals', () => {
      const vars = extractVariables('{{#if hasUser}}{{user.name}}{{/if}}');
      expect(vars).toContain('hasUser');
      expect(vars).toContain('user.name');
    });

    it('should extract from loops', () => {
      const vars = extractVariables('{{#each items}}{{name}}{{/each}}');
      expect(vars).toContain('items');
    });

    it('should handle duplicates', () => {
      const vars = extractVariables('{{name}} and {{name}} again');
      expect(vars).toEqual(['name']);
    });
  });

  describe('safeRender', () => {
    it('should render valid templates', () => {
      const result = safeRender({}, 'Hello {{name}}', { name: 'World' });
      expect(result).toEqual({
        success: true,
        result: 'Hello World'
      });
    });

    it('should handle invalid templates', () => {
      const result = safeRender({}, '{{#if test}}unclosed', {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('Template validation failed');
      expect(result.errors).toContain('1 unclosed {{#if}} tag(s)');
    });

    it('should handle render errors', () => {
      // Force an error by providing invalid partial reference
      const result = safeRender({}, '{{> nonexistent}}', {});
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('createRenderer', () => {
    it('should create reusable renderer', () => {
      const renderer = createRenderer({
        greeting: 'Hello {{name}}!'
      });
      
      expect(renderer('{{> greeting}}', { name: 'Alice' })).toBe('Hello Alice!');
      expect(renderer('{{> greeting}}', { name: 'Bob' })).toBe('Hello Bob!');
    });

    it('should handle errors in renderer', () => {
      const renderer = createRenderer();
      
      // Invalid template should throw
      expect(() => renderer('{{#if test}}', {})).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty template', () => {
      expect(render('', {})).toBe('');
    });

    it('should handle null/undefined context', () => {
      expect(render('Hello', null)).toBe('Hello');
      expect(render('Hello', undefined)).toBe('Hello');
    });

    it('should handle special values in context', () => {
      const context = {
        zero: 0,
        empty: '',
        nullValue: null,
        bool: false
      };
      
      expect(render('{{zero}}', context)).toBe('0');
      expect(render('{{empty}}', context)).toBe('');
      expect(render('{{nullValue}}', context)).toBe('');
      expect(render('{{bool}}', context)).toBe('false');
    });
  });
});