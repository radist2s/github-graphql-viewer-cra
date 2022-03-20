import React, { useState } from "react";
import {
  Routes,
  Route,
  Link,
  useParams,
  Outlet,
  useOutletContext,
  useResolvedPath,
  useLocation,
} from "react-router-dom";
import {
  Container,
  Box,
  Input,
  FormGroup,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
} from "@mui/material";

import { useQuery } from "@apollo/client";
import {
  SearchRepositoriesDocument,
  GetRepositoryBlobDocument,
  GetRepositoryTreeDocument,
} from "./generated";
import { useThrottle } from "react-use";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";

const defaultBranch = "master";

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<RepositoriesSearch />} />
        <Route path={":owner/:name"} element={<Repository />}>
          <Route index element={<Tree />} />
          <Route path={"tree/*"} element={<Tree />} />
          <Route path={"blob/*"} element={<Blob />} />
        </Route>
      </Route>
    </Routes>
  );
}

const AppLayout = () => {
  return (
    <Container maxWidth={"lg"}>
      <Box sx={{ my: 2 }}>
        <Outlet />
      </Box>
    </Container>
  );
};

const RepositoriesSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const searchQueryThrottled = useThrottle(searchQuery);
  const { data, loading } = useQuery(SearchRepositoriesDocument, {
    variables: { query: searchQueryThrottled },
  });

  return (
    <>
      <FormGroup row>
        <Input
          sx={{ width: "100%" }}
          value={searchQuery}
          placeholder={"Search query"}
          onChange={(event) => {
            setSearchQuery(event.target.value);
          }}
        />
      </FormGroup>

      {loading && (
        <CircularProgress
          sx={{
            marginLeft: "auto",
            marginRight: "auto",
            my: 2,
            display: "block",
          }}
        />
      )}
      {data?.search.edges?.length ? (
        <List dense>
          {data.search.edges.map((edge) => {
            if (edge?.node?.__typename !== "Repository") return null;

            return (
              <ListItemButton
                key={edge.node.name}
                component={Link}
                to={`/${edge.node.owner.login}/${edge.node.name}`}
              >
                <ListItemText
                  primary={edge.node.name}
                  secondary={edge.node.description}
                />
              </ListItemButton>
            );
          })}
        </List>
      ) : (
        <>
          {searchQuery && !loading && (
            <Alert severity={"info"} sx={{ my: 2 }}>
              No repositories found
            </Alert>
          )}
        </>
      )}
    </>
  );
};

const Repository = () => {
  const params = useParams<Record<"owner" | "name", string>>();

  return <Outlet context={params} />;
};

const useRepositoryContext = () => {
  return useOutletContext<Record<"owner" | "name", string>>();
};

const Tree = () => {
  const repositoryContext = useRepositoryContext();

  const resolvedPath = useResolvedPath(".");
  const location = useLocation();
  const treePath = location.pathname.slice(resolvedPath.pathname.length + 1);

  const { data, error } = useQuery(GetRepositoryTreeDocument, {
    variables: {
      ...repositoryContext,
      expression: `${defaultBranch}:${treePath}`,
    },
  });

  const repository =
    data?.repository?.__typename === "Repository"
      ? data?.repository
      : undefined;
  const tree =
    repository?.object?.__typename === "Tree" ? repository.object : undefined;

  return (
    <>
      {error && <Alert severity="error">{error.message}</Alert>}
      {repository && (
        <List dense>
          {tree?.entries?.map((entry) => {
            return (
              <ListItemButton
                key={entry.name}
                component={Link}
                to={`/${repository.owner.login}/${repository.name}/${entry.type}/${entry.path}`}
              >
                <ListItemIcon sx={{ fontSize: 20, minWidth: 0, mx: 1 }}>
                  {entry.type === "tree" && <FolderOutlinedIcon />}
                  {entry.type === "blob" && <InsertDriveFileOutlinedIcon />}
                </ListItemIcon>

                <ListItemText primary={entry.name} />
              </ListItemButton>
            );
          })}
        </List>
      )}

      <Outlet />
    </>
  );
};

const Blob = () => {
  const repositoryContext = useRepositoryContext();

  const resolvedPath = useResolvedPath(".");
  const location = useLocation();
  const blobPath = location.pathname.slice(resolvedPath.pathname.length + 1);

  const { data, error } = useQuery(GetRepositoryBlobDocument, {
    variables: {
      ...repositoryContext,
      expression: `${defaultBranch}:${blobPath}`,
    },
  });

  const code =
    data?.repository?.object?.__typename === "Blob"
      ? data.repository.object.text
      : undefined;

  return (
    <>
      {error && <Alert severity="error">{error.message}</Alert>}
      {code !== undefined && <code style={{ whiteSpace: "pre" }}>{code}</code>}
      <Outlet />
    </>
  );
};

export default App;
