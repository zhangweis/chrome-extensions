import assert from 'node:assert';
import { describe, it } from 'node:test';
import { commonMarkLinkToAnchorTag } from '../src/utils/markdown.js';

describe('commonMarkLinkToAnchorTag', function () {
  it('should convert CommonMark link to anchor tag', function () {
    const input = '[Google](https://google.com)';
    const result = commonMarkLinkToAnchorTag(input);
    assert.strictEqual(result, '<a href="https://google.com" target="_blank"> Google </a>');
  });

  it('should convert multiple CommonMark links', function () {
    const input = '[Google](https://google.com) and [GitHub](https://github.com)';
    const result = commonMarkLinkToAnchorTag(input);
    assert.strictEqual(
      result,
      '<a href="https://google.com" target="_blank"> Google </a> and <a href="https://github.com" target="_blank"> GitHub </a>'
    );
  });

  it('should use markdownLinkify for plain URLs', function () {
    const input = 'Visit https://example.com for more info';
    const result = commonMarkLinkToAnchorTag(input);
    // markdownLinkify converts plain URLs to links
    assert.ok(result.includes('href="https://example.com"'));
  });

  it('should handle text with mixed content', function () {
    const input = 'Check out [Example](https://example.com) and also visit https://google.com';
    const result = commonMarkLinkToAnchorTag(input);
    // Should contain the CommonMark link
    assert.ok(result.includes('<a href="https://example.com" target="_blank"> Example </a>'));
  });

  it('should handle links with query parameters', function () {
    const input = '[Search](https://example.com?q=test&page=1)';
    const result = commonMarkLinkToAnchorTag(input);
    assert.strictEqual(
      result,
      '<a href="https://example.com?q=test&page=1" target="_blank"> Search </a>'
    );
  });

  it('should handle links with anchors', function () {
    const input = '[Section](https://example.com#section)';
    const result = commonMarkLinkToAnchorTag(input);
    assert.strictEqual(
      result,
      '<a href="https://example.com#section" target="_blank"> Section </a>'
    );
  });

  it('should handle links with special characters in display text', function () {
    const input = '[Test & Demo](https://example.com)';
    const result = commonMarkLinkToAnchorTag(input);
    assert.strictEqual(
      result,
      '<a href="https://example.com" target="_blank"> Test & Demo </a>'
    );
  });

  it('should preserve text outside of CommonMark links', function () {
    const input = 'Before [Link](https://example.com) After';
    const result = commonMarkLinkToAnchorTag(input);
    assert.ok(result.includes('Before '));
    assert.ok(result.includes(' After'));
  });

  it('should handle empty string', function () {
    const input = '';
    const result = commonMarkLinkToAnchorTag(input);
    assert.strictEqual(result, '');
  });

  it('should handle text without CommonMark links or URLs', function () {
    const input = 'Just plain text';
    const result = commonMarkLinkToAnchorTag(input);
    assert.strictEqual(result, input);
  });
});
