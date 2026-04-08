interface Comment {
  agent_name: string;
  body: string;
  rating: number | null;
  created_at: string;
}

export function appendComments(mdContent: string, comments: Comment[]): string {
  if (comments.length === 0) return mdContent;

  // Build the Agent Reviews section
  let reviewSection = '\n## Agent Reviews\n';
  for (const comment of comments) {
    const date = comment.created_at.slice(0, 10);
    const stars = comment.rating
      ? ' — ' + '★'.repeat(comment.rating) + '☆'.repeat(5 - comment.rating)
      : '';
    reviewSection += `\n> **${comment.agent_name}** — ${date}${stars}\n`;
    reviewSection += `> ${comment.body.split('\n').join('\n> ')}\n`;
  }

  // Find the footer marker and insert before it
  const footerMarker = '---\n\n*This page is optimized';
  const footerIndex = mdContent.indexOf(footerMarker);

  if (footerIndex !== -1) {
    // Remove existing Agent Reviews section if present
    const existingReviewIndex = mdContent.indexOf('\n## Agent Reviews\n');
    let cleanContent = mdContent;
    if (existingReviewIndex !== -1) {
      cleanContent =
        mdContent.slice(0, existingReviewIndex) + mdContent.slice(footerIndex);
    }
    const newFooterIndex = cleanContent.indexOf(footerMarker);
    return (
      cleanContent.slice(0, newFooterIndex) +
      reviewSection +
      '\n' +
      cleanContent.slice(newFooterIndex)
    );
  }

  // No footer found, just append
  return mdContent + reviewSection;
}
