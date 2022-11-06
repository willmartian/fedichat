import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Task } from "@lit-labs/task";
import { repeat } from "lit/directives/repeat.js";
import type { Account, Comment, CommentsResponse } from "../types";

@customElement("fedi-chat")
export class FediChat extends LitElement {
  static styles = css`
    article {
      display: block;

      margin-top: 1em;
      margin-bottom: 1em;
      
      max-width: 400px;
      min-width: 250px;
      padding: 1em;
      padding-bottom: 0;

      font-family: sans-serif;
    }

    .content {
      display: block;
      margin-block-start: 1em;
      margin-block-end: 1em;  
    }

    .content > p {
      margin-top: 0;
      margin-bottom: 0;
    }

    .author > div:first-child {
      font-weight: bold;
      margin-bottom: .25em;
    }

    .author a {
      font-size: .85em;
    }

    .action-bar {
      display: flex;
      justify-content: space-around;
    }
  `;

  @property()
  src!: string;

  @property({ 
    type: Boolean, 
    reflect: true,
    attribute: 'hide-action-bar'
  })
  hideActionBar: boolean = false;

  private _repliesTask = new Task(
    this,
    ([src]) =>
      fetch(src).then((response) =>
        response.json() as Promise<CommentsResponse>
      ),
    () => [this.parseSrc(this.src) + '/context'],
  );

  private _actionTask = new Task(
    this,
    ([src]) =>
      fetch(src).then((response) =>
        response.json() as Promise<Comment>
      ),
    () => [this.parseSrc(this.src)],
  );

  connectedCallback() {
    super.connectedCallback();
  }

  private parseSrc(src: string) {
    const id = src.split('/').at(-1)!;
    const url = new URL(src);
    return `https://${url.hostname}/api/v1/statuses/${id}`;
  }

  private getFullUsername(account: Account) {
    const url = new URL(account.url);
    return `@${account.username}@${url.hostname}`;
  }

  render() {
    if (!this.src) {
      return html`<div>Make sure you provided the link to a host comment in the "src" field.</div>`;
    }
    return html`
      ${this.hideActionBar ? nothing : this._actionTask.render({
        pending: () => html`<div>Loading...</div>`,
        complete: (comment) => this.renderActionBar(comment.replies_count, comment.reblogs_count, comment.favourites_count),
        error: () => html`<div>Error!</div>`
      })}
      <div part="comment-container">
        ${this.renderCommentList()}
      </div>
    `
  }

  private renderComment(comment: Comment) {
    return html`<article class="comment" part="comment">
      <div class="author">
        <div>${comment.account.display_name}</div>
        <div>
          <a href=${comment.account.url}>${this.getFullUsername(comment.account)}</a>
        </div>
      </div>
      <div class="content" .innerHTML=${comment.content}></div>
    </article>`;
  }

  private renderActionBar(replies_count: number, reblogs_count: number, favourites_count: number) {
    return html`<div class="action-bar" part="action-bar">
      <div>${replies_count} Replies</div>
      <div>${reblogs_count} Boosts</div>
      <div>${favourites_count} Favorites</div>
    </div>`
  }

  private renderCommentList() {
    return this._repliesTask.render({
      pending: () => html`Loading comments...`,
      complete: (comments) => repeat(
        comments.descendants,
        (comment) => comment.id,
        this.renderComment.bind(this),
      ),
      error: () => html`Error. Unable to load comments from ${this.src}`,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "fedi-chat": FediChat;
  }
}
