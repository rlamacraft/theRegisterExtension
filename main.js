var numOfAdditionalPages = 0; // ensure all additional pages have been fetched before parsing

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
  if(document.getElementsByClassName("forums-page-nav").length !== 0)
    document.getElementsByClassName("forums-page-nav")[0].style.display = "none";

  //redirect if on an additional page
  const regex = new RegExp("/forum/(\\d)/(.*)");
  const pathnameParts = regex.exec(window.location.pathname);
  if(pathnameParts[1] !== "1") {
    window.location = "http://forums.theregister.co.uk/forum/1/" + pathnameParts[2];
  }

  let forumPosts = {};
  let rootForumPosts = [];

  // parse local posts
  const forumPostsContainer = document.getElementById("forum_posts");
  parseForumPosts(forumPostsContainer, forumPosts, rootForumPosts);

  // get links to additional pages
  const additionalPageLinks = [];
  if(document.getElementsByClassName("forums-page-nav").length > 0)
    document.getElementsByClassName("forums-page-nav")[0].getElementsByTagName("a");

  // remove the 'next page' link as we only care about the numbered pages and convert to array so that we can remove the pages as they have been parsed
  const additionalPages = [];
  for( let eachNode = 0; eachNode < additionalPageLinks.length - 1; ++eachNode ) {
    additionalPages.push(additionalPageLinks[eachNode]);
  }
  numOfAdditionalPages = additionalPages.length;

  // if there are additional pages, fetch and parse before rendering
  if(additionalPages.length > 0) {
    const additionalPagesHTMLContent = new Array(additionalPages.length);
    additionalPages.forEach(function(value, index) {
      additionalPagesHTMLContent[index] = getAdditionPagePostContainer(value, function(content) {
        additionalPagesHTMLContent[index] = content;
        additionalPagesHTMLContent.forEach(function(value, index) {
          parseForumPosts(value, forumPosts, rootForumPosts);
        });
        renderForumPosts(rootForumPosts, forumPostsContainer);
      });
    });
  } else {
    renderForumPosts(rootForumPosts, forumPostsContainer); // skip if there are no additional pages, just render the one page
  }
}

/*
** Get the container of the posts on a given additional pages of posts
*/
function getAdditionPagePostContainer(additionalPage, finishedCallback) {
  let returnedAdditionalPageContent = 0;

  function processResponse(responseText) {
    returnedAdditionalPageContent++;

    const content = document.createElement('html');
    content.innerHTML = xmlHttp.responseText;
    const postsContainer = content.querySelector("#forum_posts");

    if(returnedAdditionalPageContent == numOfAdditionalPages) {
      finishedCallback(postsContainer);
    } else {
      return(postsContainer);
    }
  }

  const additionalPageURL = additionalPage.getAttribute("href");
  const xmlHttp = new XMLHttpRequest();
  xmlHttp.onreadystatechange = function() {
      if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
        processResponse(xmlHttp.responseText);
      }
  }
  xmlHttp.open("GET", additionalPageURL, true); // true for asynchronous
  xmlHttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
  xmlHttp.send();
}

/**
** Parses the HTML of the posts to extract the data necessary to build a tree of all posts and replies
**/
function parseForumPosts(forum_posts_container, forumPosts, rootForumPosts) {

  /* Get the Id of the post, from the id of the permalink anchor tag. Returns undefined if post is deleted. */
  function extractId(forumPost_html) {
    if(forumPost_html.classList.contains('deleted'))
      return undefined;
    const permalink = forumPost_html.getElementsByClassName("permalink")[0];
    if(permalink === undefined)
      debugger;
    return( permalink.getAttribute("id").substr(2) ); // id is 'c_#######', so .substr(2) drops the 'c_'
  }

  /* Get the parent Id of the post, from the in-reply-to link. Returns undefined if root node. */
  function extractParentId(forumPost_html) {
    try {
      const reply_to = forumPost_html.getElementsByClassName("in-reply-to")[0];
      const reply_to_link = reply_to.getAttribute("href");
      const reply_to_link_parts = reply_to_link.split("/");
      return( reply_to_link_parts[reply_to_link_parts.length - 1] );
    } catch(err) {
      return(undefined);
    }
  }

  let forumPosts_html = forum_posts_container.getElementsByClassName("post");

  for (eachForumPost_html of forumPosts_html) {
    const id = extractId(eachForumPost_html)
    const parentId = extractParentId(eachForumPost_html);

    const newForumPost = new forumPost(id, parentId, eachForumPost_html);
    if(newForumPost.id !== undefined)
      forumPosts[id] = newForumPost;
    if(parentId !== undefined) {
      forumPosts[parentId].children.push(newForumPost);
    } else {
      rootForumPosts.push(newForumPost);
    }
  }
}

/**
** Renders a forumPost onto the page using the original HTML
**/
function renderForumPosts(rootForumPosts, forumPostsContainer) {

  /* Recursively render the forumPost and all of its children recursively */
  function renderPost(post, depth) {
    const colours = ['#1e88e5', '#ab47bc', '#4caf50', '#fb8c00', '#e53935'];

    function inert(isClosed, actionsContainer, childPostWrappers) {
      actionsContainer.inert = isClosed;
      for(eachChildPost of childPostWrappers) {
        eachChildPost.inert = isClosed;
      }
    }

    let postWrapper = document.createElement('div');
    postWrapper.className = 'postWrapper';
    let postHTML = post.html;
    postHTML.style = 'border-left-color: ' + colours[depth % 5] + ' !important';
    const toggleButton = document.createElement('button');
    toggleButton.className = 'reg_btn post_toggle';
    toggleButton.innerText = 'close';
    toggleButton.addEventListener('click', function(evt) { // toggle open-close functionality
      const btn = evt.target;
      const postWrapper = btn.parentNode.parentNode;
      const actionsContainer = btn.parentNode.getElementsByClassName('actions')[0];
      const childPostWrappers = postWrapper.getElementsByClassName('postWrapper');
      let isClosed = postWrapper.hasAttribute('closed');

      if(!isClosed) {
        btn.innerText = 'open';
        postWrapper.setAttribute('closed', 'closed');
        inert(true, actionsContainer, childPostWrappers);
      } else {
        btn.innerText = 'close';
        postWrapper.removeAttribute('closed');
        inert(false, actionsContainer, childPostWrappers);
      }

    });
    postHTML.insertBefore(toggleButton, postHTML.firstElementChild)
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
