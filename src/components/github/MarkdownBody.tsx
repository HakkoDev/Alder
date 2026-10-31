import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

/** GitHub-authored Markdown and basic HTML, sanitized before entering the DOM. */
export function MarkdownBody({ body }: { body: string | null | undefined }) {
    return (
        <div className="github-markdown">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeSanitize]}
                skipHtml={false}
                components={{
                    a: ({ href, children }) => (
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {children}
                        </a>
                    ),
                    img: ({ src, alt }) => (
                        <img
                            src={src}
                            alt={alt || ""}
                            loading="lazy"
                        />
                    ),
                }}
            >
                {body?.trim() || "No description provided."}
            </ReactMarkdown>
        </div>
    );
}
