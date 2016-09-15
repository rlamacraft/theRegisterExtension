/**
** Model of a single post, forms the node on a tree of posts and replies
**/
class forumPost {
  constructor(id, parentId, html) {
    this.id = id;
    this.parentId = parentId;
    this.html = html;
    this.children = [];
  }
}

if(window.location.hostname == "forums.theregister.co.uk") {
  const forumPostsContainer = document.getElementById("forum_posts");
  const parsedForumPosts = parseForumPosts(forumPostsContainer);
  renderForumPosts(parsedForumPosts, forumPostsContainer);
}

/**
** Parses the HTML of the posts to extract the data necessary to build a tree of all posts and replies
**/
function parseForumPosts(forum_posts_container) {

  /* Get the Id of the post, from the id of the permalink anchor tag */
  function extractId(forumPost_html) {
    const permalink = forumPost_html.getElementsByClassName("permalink")[0];
    return( permalink.getAttribute("id").substr(2) ); // id is 'c_#######', so .substr(2) drops the 'c_'
  }

  /* Get the parent Id of the post, from the in-reply-to link. Returns empty string if root node. */
  function extractParentId(forumPost_html) {
    try {
      const reply_to = forumPost_html.getElementsByClassName("in-reply-to")[0];
      const reply_to_link = reply_to.getAttribute("href");
      const reply_to_link_parts = reply_to_link.split("/");
      return( reply_to_link_parts[reply_to_link_parts.length - 1] );
    } catch(err) {
      return("");
    }
  }

  forumPosts = {};
  rootForumPosts = [];

  let forumPosts_html = forum_posts_container.getElementsByClassName("post");

  for (eachForumPost_html of forumPosts_html) {
    const id = extractId(eachForumPost_html)
    const parentId = extractParentId(eachForumPost_html);

    const newForumPost = new forumPost(id, parentId, eachForumPost_html);
    forumPosts[id] = newForumPost;
    if(parentId != "") {
      forumPosts[parentId].children.push(newForumPost);
    } else {
      rootForumPosts.push(newForumPost);
    }

  }

  return rootForumPosts;
}

/**
** Renders a forumPost onto the page using the original HTML
**/
function renderForumPosts(rootForumPosts, forumPostsContainer) {

  /* Recursively render the forumPost and all of its children recursively */
  function renderPost(post, depth) {
    const colours = ['#1e88e5', '#ab47bc', '#4caf50', '#fb8c00', '#e53935'];

    let postWrapper = document.createElement('div');
    postWrapper.className ='postWrapper';
    let postHTML = post.html;
    //postHTML.styles = 'color: red';
    postHTML.style = 'border-left-color: ' + colours[depth % 5] + ' !important';
    //debugger;
    postWrapper.appendChild(postHTML);
    for(eachChildPost of post.children) {
      postWrapper.appendChild(renderPost(eachChildPost, depth + 1));
    }
    return(postWrapper);
  }

  forumPostsContainer.innerHTML = "";
  for (eachRootPost of rootForumPosts) {
    forumPostsContainer.appendChild(renderPost(eachRootPost, 0));
  }
}
