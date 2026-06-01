# Expanded Question Bank Raw Suites

Copy one `@suite` block at a time into Paste Topic Raw. The C# Part 1 suite is the pasted source you provided; this file extends it with C# Parts 2-5, .NET Parts 1-3, React Parts 1-3, Java Parts 1-3, and coding-practice suites for each stack.

## C# Concept Suites

```text
@suite
title=C# Part 2 - Control Flow, Methods and Scope
description=Train if/else, switch, loops, method parameters, return values, overloads and variable scope.
duration=45

@q
type=single
title=Which statement chooses between two branches based on a boolean condition?
A=for
B=if
C=using
D=namespace
answer=B
explanation=if evaluates a boolean expression and runs a branch.
tags=csharp,controlflow

@q
type=single
title=What is printed? int x = 3; if (x > 5) Console.WriteLine("A"); else Console.WriteLine("B");
A=A
B=B
C=3
D=Compile Error
answer=B
explanation=3 is not greater than 5, so the else branch runs.
tags=csharp,if

@q
type=boolean
title=A switch expression can return a value in modern C#.
answer=true
explanation=Switch expressions were added to make value-producing branching concise.
tags=csharp,switch

@q
type=single
title=Which loop is best when you already know you want to count from 0 to 9?
A=for
B=try
C=lock
D=record
answer=A
explanation=A for loop is idiomatic for counted iteration.
tags=csharp,loops

@q
type=single
title=What does continue do inside a loop?
A=Stops the entire program
B=Skips to the next iteration
C=Returns from the method
D=Creates a new thread
answer=B
explanation=continue skips the remaining body for the current iteration.
tags=csharp,loops

@q
type=single
title=What does break do inside a loop?
A=Exits the nearest loop
B=Skips one property
C=Deletes a variable
D=Boxes a value
answer=A
explanation=break exits the nearest loop or switch.
tags=csharp,loops

@q
type=boolean
title=A method with return type void must return a value.
answer=false
explanation=void means the method does not return a value.
tags=csharp,methods

@q
type=single
title=Which keyword is used to return a value from a method?
A=yield
B=return
C=out
D=base
answer=B
explanation=return exits the method and can pass a value back.
tags=csharp,methods

@q
type=single
title=What is method overloading?
A=Two methods with the same name but different parameter lists
B=Changing a private field directly
C=Converting int to object
D=Running a method in parallel
answer=A
explanation=Overloads share a name but differ by parameters.
tags=csharp,methods,overload

@q
type=boolean
title=A local variable declared inside a method is directly accessible from every other method in the class.
answer=false
explanation=Local variables are scoped to their block or method.
tags=csharp,scope

@q
type=single
title=What does the out keyword allow?
A=A method can assign a value to an argument for the caller
B=A class becomes public
C=A string becomes nullable
D=A loop exits immediately
answer=A
explanation=out parameters are assigned by the called method and observed by the caller.
tags=csharp,parameters

@q
type=single
title=What does params allow in a method parameter?
A=A variable number of arguments
B=Only null arguments
C=Only reference types
D=Compile-time constants only
answer=A
explanation=params lets callers pass a variable number of arguments as an array.
tags=csharp,parameters
```

```text
@suite
title=C# Part 3 - OOP, Properties and Inheritance
description=Train classes, objects, constructors, properties, encapsulation, inheritance, virtual methods and interfaces.
duration=50

@q
type=single
title=Which member initializes a new object?
A=constructor
B=namespace
C=enum
D=attribute
answer=A
explanation=A constructor runs when a new instance is created.
tags=csharp,oop,constructor

@q
type=boolean
title=A class can have more than one constructor.
answer=true
explanation=Constructors can be overloaded with different parameter lists.
tags=csharp,constructor,overload

@q
type=single
title=Which access modifier allows access only inside the same class?
A=public
B=private
C=internal
D=protected internal
answer=B
explanation=private is the most restrictive class-member access modifier.
tags=csharp,access

@q
type=single
title=What is encapsulation mainly about?
A=Hiding internal state behind a controlled API
B=Making every field public
C=Running code asynchronously
D=Converting strings to numbers
answer=A
explanation=Encapsulation protects invariants by controlling access to state.
tags=csharp,oop,encapsulation

@q
type=single
title=What does get; set; usually define?
A=Auto-implemented property
B=Enum member
C=Loop condition
D=Exception filter
answer=A
explanation=Auto-properties create a property with compiler-generated backing storage.
tags=csharp,property

@q
type=boolean
title=A read-only property can expose a value without allowing callers to assign it.
answer=true
explanation=A property can have a public getter and no public setter.
tags=csharp,property

@q
type=single
title=Which keyword indicates a class inherits from another class?
A=extends
B=:
C=implements
D=inherits
answer=B
explanation=C# uses a colon for base classes and interfaces.
tags=csharp,inheritance

@q
type=single
title=Which keyword allows a derived class to override a method?
A=virtual
B=sealed
C=static
D=readonly
answer=A
explanation=A base method must be virtual, abstract, or override to be overridden.
tags=csharp,polymorphism

@q
type=single
title=Which keyword is used in the derived class implementation?
A=replace
B=override
C=virtualize
D=shadow
answer=B
explanation=override replaces a virtual or abstract base member implementation.
tags=csharp,polymorphism

@q
type=boolean
title=An interface can describe behavior without storing normal instance fields.
answer=true
explanation=Interfaces define contracts; classes or structs implement them.
tags=csharp,interface

@q
type=single
title=What is polymorphism?
A=Treating different concrete types through a shared base type or interface
B=Storing keys and values
C=Copying a value type
D=Parsing JSON
answer=A
explanation=Polymorphism lets callers depend on common contracts.
tags=csharp,oop,polymorphism

@q
type=single
title=What does sealed prevent on a class?
A=Further inheritance
B=Object creation
C=Garbage collection
D=String interpolation
answer=A
explanation=A sealed class cannot be inherited.
tags=csharp,inheritance
```

```text
@suite
title=C# Part 4 - LINQ, Delegates, Lambdas and Generics
description=Train Func, Action, delegates, lambdas, IEnumerable, LINQ filtering/projection and generic type safety.
duration=55

@q
type=single
title=What is a lambda expression commonly used for?
A=Writing inline function logic
B=Declaring a namespace
C=Allocating unmanaged memory
D=Creating a NuGet package
answer=A
explanation=Lambdas provide concise function expressions.
tags=csharp,lambda

@q
type=single
title=Which delegate type represents a method that returns a value?
A=Action
B=Func
C=Task
D=List
answer=B
explanation=Func delegates return a value; Action delegates return void.
tags=csharp,delegate

@q
type=boolean
title=Action<string> can represent a method that takes a string and returns void.
answer=true
explanation=Action delegates model void-returning callbacks.
tags=csharp,delegate

@q
type=single
title=What does IEnumerable<T> represent?
A=A sequence that can be iterated
B=A mutable database transaction
C=A compiled assembly
D=A JSON object
answer=A
explanation=IEnumerable<T> exposes iteration over a typed sequence.
tags=csharp,ienumerable

@q
type=single
title=Which LINQ method filters a sequence?
A=Select
B=Where
C=OrderBy
D=ToString
answer=B
explanation=Where keeps elements that satisfy a predicate.
tags=csharp,linq

@q
type=single
title=Which LINQ method projects each item into a new shape?
A=Where
B=Select
C=Any
D=Count
answer=B
explanation=Select maps each source item to a result item.
tags=csharp,linq

@q
type=boolean
title=LINQ queries over IEnumerable<T> are often deferred until enumeration.
answer=true
explanation=Many LINQ operators use deferred execution.
tags=csharp,linq,deferred

@q
type=single
title=What does Any() answer?
A=Whether at least one element exists or matches
B=The first string only
C=The last index
D=The runtime type
answer=A
explanation=Any returns a boolean.
tags=csharp,linq

@q
type=single
title=Why use generics such as List<int>?
A=To get compile-time type safety
B=To disable null checks
C=To force boxing
D=To avoid namespaces
answer=A
explanation=Generics preserve type information and reduce casts.
tags=csharp,generics

@q
type=boolean
title=List<object> and List<string> are the same compile-time type.
answer=false
explanation=They are different constructed generic types.
tags=csharp,generics

@q
type=single
title=What does ToList() do in a LINQ chain?
A=Materializes the sequence into a List<T>
B=Deletes all values
C=Sorts descending only
D=Creates a dictionary
answer=A
explanation=ToList enumerates and stores results in a list.
tags=csharp,linq

@q
type=single
title=Which LINQ method sorts ascending by a key?
A=GroupBy
B=OrderBy
C=ReverseOnly
D=SelectMany
answer=B
explanation=OrderBy sorts elements by a selected key.
tags=csharp,linq
```

```text
@suite
title=C# Part 5 - Async, Exceptions, Records and Resource Safety
description=Train Task, async/await, exception handling, using, records, immutability and nullable reference types.
duration=55

@q
type=single
title=What does async usually allow inside a method?
A=Using await
B=Skipping compilation
C=Changing int into string
D=Disabling exceptions
answer=A
explanation=async enables await and changes how the method returns asynchronous results.
tags=csharp,async

@q
type=single
title=Which type commonly represents an asynchronous operation with no result?
A=Task
B=ThreadOnly
C=ActionResult
D=Span
answer=A
explanation=Task represents an asynchronous operation.
tags=csharp,task

@q
type=single
title=Which type commonly represents an asynchronous operation returning an int?
A=Task<int>
B=List<int>
C=Func<int>
D=IEnumerable<int>
answer=A
explanation=Task<T> represents an asynchronous operation that produces T.
tags=csharp,task

@q
type=boolean
title=await blocks the current thread in exactly the same way as Thread.Sleep.
answer=false
explanation=await asynchronously waits and can release the current thread to do other work.
tags=csharp,async

@q
type=single
title=Which block handles an exception?
A=catch
B=namespace
C=record
D=foreach
answer=A
explanation=A catch block handles exceptions thrown in a try block.
tags=csharp,exceptions

@q
type=single
title=Which block runs whether or not an exception is thrown?
A=finally
B=where
C=select
D=partial
answer=A
explanation=finally runs after try/catch flow before control leaves.
tags=csharp,exceptions

@q
type=boolean
title=using can help dispose resources even when an exception occurs.
answer=true
explanation=using ensures IDisposable resources are disposed.
tags=csharp,using,dispose

@q
type=single
title=What is a record especially useful for?
A=Immutable data-focused models with value-based equality
B=Opening a socket manually
C=Declaring unsafe pointers only
D=Skipping constructors
answer=A
explanation=Records are designed for data models and value-like equality.
tags=csharp,record

@q
type=single
title=What does the with expression do for records?
A=Creates a copy with selected changed properties
B=Starts a transaction
C=Disables nullability
D=Runs a loop
answer=A
explanation=with creates a non-destructive mutation copy.
tags=csharp,record

@q
type=boolean
title=Nullable reference types help the compiler warn about possible null usage.
answer=true
explanation=Nullable annotations let static analysis warn about null risks.
tags=csharp,nullability

@q
type=single
title=What does string? name mean when nullable reference types are enabled?
A=name may be null
B=name is always empty
C=name is a value type
D=name is dynamic
answer=A
explanation=The question mark marks the reference as nullable.
tags=csharp,nullability

@q
type=single
title=Which operator throws if the left side is null?
A=??
B=!.
C=?. 
D=+
answer=B
explanation=The null-forgiving operator suppresses warnings; member access on null still throws at runtime.
tags=csharp,nullability
```

## .NET Concept Suites

```text
@suite
title=.NET Part 1 - Runtime, SDK, CLI and Project Structure
description=Train the difference between .NET SDK/runtime, csproj basics, NuGet, build, run, publish and configuration files.
duration=40

@q
type=single
title=Which command creates a new console project?
A=dotnet new console
B=dotnet make console
C=nuget console
D=dotnet start
answer=A
explanation=dotnet new console scaffolds a console application.
tags=dotnet,cli

@q
type=single
title=Which command restores NuGet packages?
A=dotnet restore
B=dotnet clean
C=dotnet package
D=dotnet sync
answer=A
explanation=restore downloads package dependencies.
tags=dotnet,nuget

@q
type=boolean
title=The .NET SDK includes tools needed to build projects.
answer=true
explanation=The SDK includes compilers, templates and CLI build tools.
tags=dotnet,sdk

@q
type=single
title=What file usually stores project references and package references?
A=.csproj
B=.sln.user
C=appsettings.json only
D=Program.cs only
answer=A
explanation=The project file defines build settings and references.
tags=dotnet,csproj

@q
type=single
title=Which command compiles a .NET project?
A=dotnet build
B=dotnet init
C=dotnet zip
D=dotnet serve
answer=A
explanation=dotnet build compiles the project and dependencies.
tags=dotnet,build

@q
type=single
title=Which command runs the current project?
A=dotnet run
B=dotnet execall
C=dotnet start-web
D=dotnet package
answer=A
explanation=dotnet run builds and runs the app.
tags=dotnet,cli

@q
type=boolean
title=NuGet is commonly used for .NET package management.
answer=true
explanation=NuGet is the standard package ecosystem for .NET.
tags=dotnet,nuget

@q
type=single
title=What does dotnet publish prepare?
A=Deployable output
B=Only source formatting
C=Only unit tests
D=Only a git tag
answer=A
explanation=publish produces files intended for deployment.
tags=dotnet,publish

@q
type=single
title=Which file commonly stores environment-specific app settings?
A=appsettings.json
B=README.lock
C=Program.dll.config.js
D=package.json
answer=A
explanation=.NET apps often read configuration from appsettings.json.
tags=dotnet,configuration

@q
type=boolean
title=A solution file can group multiple projects.
answer=true
explanation=.sln files organize multiple related projects.
tags=dotnet,solution
```

```text
@suite
title=.NET Part 2 - ASP.NET Core APIs and Dependency Injection
description=Train controllers/minimal APIs, middleware, routing, dependency injection, model binding and status codes.
duration=50

@q
type=single
title=What is middleware in ASP.NET Core?
A=Components in the HTTP request pipeline
B=Only database tables
C=Only CSS files
D=NuGet lock files
answer=A
explanation=Middleware processes requests and responses in order.
tags=dotnet,aspnetcore,middleware

@q
type=single
title=Which method maps a GET endpoint in minimal APIs?
A=MapGet
B=UseGetOnly
C=RouteGet
D=AddGet
answer=A
explanation=MapGet registers an HTTP GET route handler.
tags=dotnet,minimalapi

@q
type=boolean
title=Dependency injection helps classes depend on abstractions instead of constructing everything themselves.
answer=true
explanation=DI supplies dependencies from a container, improving testability.
tags=dotnet,di

@q
type=single
title=Which lifetime creates one service instance per HTTP request?
A=Singleton
B=Scoped
C=Transient
D=Static
answer=B
explanation=Scoped services are reused within a request scope.
tags=dotnet,di,lifetime

@q
type=single
title=Which lifetime creates a new instance each time it is requested?
A=Transient
B=Scoped
C=Singleton
D=Global
answer=A
explanation=Transient services are created per resolution.
tags=dotnet,di,lifetime

@q
type=single
title=What is model binding?
A=Mapping request data into parameters or models
B=Compiling Razor files only
C=Creating a database index
D=Encrypting assemblies
answer=A
explanation=Model binding binds route, query, header and body data.
tags=dotnet,modelbinding

@q
type=single
title=Which status code usually means a resource was created?
A=201
B=204
C=301
D=500
answer=A
explanation=201 Created indicates successful resource creation.
tags=http,api

@q
type=boolean
title=Returning 404 is appropriate when a requested resource does not exist.
answer=true
explanation=404 Not Found communicates missing resources.
tags=http,api

@q
type=single
title=What does UseAuthentication usually do?
A=Identifies the user from credentials/token
B=Writes database migrations
C=Starts React
D=Sorts response JSON
answer=A
explanation=Authentication establishes who the caller is.
tags=dotnet,security

@q
type=single
title=What does authorization decide?
A=Whether the authenticated caller may perform an action
B=Whether C# compiles
C=Whether NuGet exists
D=Whether JSON is formatted
answer=A
explanation=Authorization checks permissions and policies.
tags=dotnet,security
```

```text
@suite
title=.NET Part 3 - EF Core, Testing, Logging and Production Readiness
description=Train DbContext, migrations, async database calls, logging, options, unit tests and production configuration.
duration=55

@q
type=single
title=What does DbContext represent in EF Core?
A=A session with the database and change tracker
B=A CSS module
C=A NuGet account
D=A compiled executable
answer=A
explanation=DbContext coordinates queries, changes and persistence.
tags=dotnet,efcore

@q
type=single
title=What are EF Core migrations used for?
A=Versioning database schema changes
B=Bundling React assets
C=Creating JWT tokens
D=Formatting C# files
answer=A
explanation=Migrations describe schema changes over time.
tags=dotnet,efcore,migrations

@q
type=boolean
title=AsNoTracking can improve read-only query performance.
answer=true
explanation=It avoids change tracking when updates are not needed.
tags=dotnet,efcore

@q
type=single
title=Which method asynchronously saves tracked changes?
A=SaveChangesAsync
B=CommitNow
C=FlushAsyncOnly
D=WriteAll
answer=A
explanation=SaveChangesAsync persists tracked changes asynchronously.
tags=dotnet,efcore,async

@q
type=single
title=What is structured logging?
A=Logging message templates with named values
B=Only writing plain strings to console
C=Saving logs in source control
D=Logging without timestamps
answer=A
explanation=Structured logs keep queryable properties.
tags=dotnet,logging

@q
type=boolean
title=IOptions<T> is commonly used to bind configuration sections to typed settings.
answer=true
explanation=The options pattern provides typed configuration access.
tags=dotnet,configuration

@q
type=single
title=What should unit tests avoid when possible?
A=Slow external dependencies that make tests flaky
B=Assertions
C=Small focused methods
D=Clear names
answer=A
explanation=Unit tests should be fast and deterministic.
tags=testing

@q
type=single
title=Which environment name is commonly used for local developer settings?
A=Development
B=ProductionOnly
C=NuGet
D=Runtime
answer=A
explanation=ASPNETCORE_ENVIRONMENT is often Development locally.
tags=dotnet,environment

@q
type=single
title=What is health check middleware useful for?
A=Reporting app readiness/liveness to infrastructure
B=Generating C# syntax
C=Deleting migrations
D=Changing HTTP to FTP
answer=A
explanation=Health checks help load balancers and deployment systems assess status.
tags=dotnet,production

@q
type=boolean
title=Secrets should usually be committed directly into appsettings.json.
answer=false
explanation=Secrets should be stored in secret managers or environment-specific secure storage.
tags=dotnet,security
```

## React Concept Suites

```text
@suite
title=React Part 1 - Components, JSX, Props and State
description=Train component composition, JSX rules, props, state, events and controlled inputs.
duration=45

@q
type=single
title=What is a React component?
A=A reusable UI function or class
B=A database table
C=A CSS-only animation
D=A package lock entry
answer=A
explanation=Components define reusable pieces of UI.
tags=react,components

@q
type=boolean
title=JSX allows JavaScript expressions inside curly braces.
answer=true
explanation=JSX uses braces to embed expressions.
tags=react,jsx

@q
type=single
title=What are props used for?
A=Passing data from parent to child
B=Mutating the DOM directly
C=Installing npm packages
D=Starting a server
answer=A
explanation=Props are inputs passed into components.
tags=react,props

@q
type=boolean
title=A child component should directly mutate its props.
answer=false
explanation=Props are read-only from the child perspective.
tags=react,props

@q
type=single
title=Which hook stores local component state?
A=useState
B=useProps
C=useHtml
D=useClass
answer=A
explanation=useState stores state and provides a setter.
tags=react,state

@q
type=single
title=Why use a controlled input?
A=The input value is driven by React state
B=It disables all events
C=It avoids rendering
D=It stores data only in CSS
answer=A
explanation=Controlled inputs keep form state in React.
tags=react,forms

@q
type=single
title=Which attribute is used for CSS class names in JSX?
A=className
B=class
C=cssClassOnly
D=styleName
answer=A
explanation=JSX uses className because class is a JavaScript keyword.
tags=react,jsx

@q
type=boolean
title=React state updates should be treated as immutable updates.
answer=true
explanation=Creating new objects/arrays helps React detect changes.
tags=react,state

@q
type=single
title=What should key help React identify in a list?
A=Which items changed, were added, or removed
B=Which CSS file to load
C=Which server port to use
D=Which package manager to install
answer=A
explanation=Keys help React reconcile list children.
tags=react,lists

@q
type=single
title=What is the result of calling setState during render unconditionally?
A=Likely an infinite render loop
B=No render ever happens
C=The app becomes static HTML
D=TypeScript compiles faster
answer=A
explanation=Updating state while rendering can trigger another render repeatedly.
tags=react,state
```

```text
@suite
title=React Part 2 - Effects, Data Fetching and Performance
description=Train useEffect, dependency arrays, cleanup, memoization, derived state and async UI states.
duration=50

@q
type=single
title=When does useEffect run by default?
A=After every committed render
B=Before the component function is called
C=Only during build
D=Only on server restart
answer=A
explanation=Without dependencies, an effect runs after every render commit.
tags=react,useeffect

@q
type=single
title=What does an empty dependency array usually mean?
A=Run after initial mount only
B=Run before every click
C=Never compile
D=Run only during npm install
answer=A
explanation=[] tells React the effect has no reactive dependencies.
tags=react,useeffect

@q
type=boolean
title=Effects can return a cleanup function.
answer=true
explanation=Cleanup unsubscribes, clears timers, or cancels work before reruns/unmount.
tags=react,useeffect

@q
type=single
title=What problem can missing dependencies cause?
A=Stale closures or outdated values
B=Automatic CSS deletion
C=Server compilation failure only
D=Disabled JSX
answer=A
explanation=Effects capture values from the render where they were created.
tags=react,useeffect

@q
type=single
title=Which hook memoizes an expensive computed value?
A=useMemo
B=useStateOnly
C=useEventLoop
D=usePackage
answer=A
explanation=useMemo caches a calculation until dependencies change.
tags=react,performance

@q
type=single
title=Which hook memoizes a function reference?
A=useCallback
B=useClassName
C=useRoute
D=useJson
answer=A
explanation=useCallback returns a stable callback when dependencies are unchanged.
tags=react,performance

@q
type=boolean
title=You should usually store data in state if it can be derived from existing props/state during render.
answer=false
explanation=Derived values can often be computed instead of duplicated in state.
tags=react,state

@q
type=single
title=Which UI states should data fetching commonly model?
A=loading, success, error
B=compile, package, publish only
C=hover only
D=CSS only
answer=A
explanation=Async UIs need to represent pending, fulfilled and failed states.
tags=react,datafetching

@q
type=single
title=Why abort or ignore outdated fetches in an effect?
A=To prevent older responses from overwriting newer state
B=To make JSON invalid
C=To stop all rendering
D=To remove keys from lists
answer=A
explanation=Race conditions can let stale requests update current UI.
tags=react,datafetching

@q
type=boolean
title=React.memo can skip rerendering a component when props are equal.
answer=true
explanation=React.memo memoizes component rendering based on props comparison.
tags=react,performance
```

```text
@suite
title=React Part 3 - Routing, Forms, TypeScript and Architecture
description=Train route params, form validation, component boundaries, custom hooks, TypeScript props and error boundaries.
duration=55

@q
type=single
title=What is a custom hook?
A=A function that uses hooks to reuse stateful logic
B=A CSS selector
C=A database migration
D=A package registry
answer=A
explanation=Custom hooks extract reusable hook-based logic.
tags=react,hooks

@q
type=boolean
title=Custom hook names should start with use.
answer=true
explanation=The naming convention lets lint rules enforce hook usage.
tags=react,hooks

@q
type=single
title=What should route params usually represent?
A=Values captured from the URL path
B=Only CSS variables
C=Only npm versions
D=Only browser cookies
answer=A
explanation=Route params come from dynamic URL segments.
tags=react,routing

@q
type=single
title=Why type component props in TypeScript?
A=To catch incorrect prop usage at compile time
B=To skip rendering
C=To hide state from React
D=To remove JSX
answer=A
explanation=Prop types document and verify component inputs.
tags=react,typescript

@q
type=single
title=What is prop drilling?
A=Passing props through intermediate components that do not need them
B=Installing props from npm
C=Deleting child components
D=Running tests repeatedly
answer=A
explanation=Prop drilling can indicate shared state should move or use context.
tags=react,architecture

@q
type=boolean
title=Context is useful for values many components need, such as auth/user/theme.
answer=true
explanation=Context avoids passing common values through every layer manually.
tags=react,context

@q
type=single
title=What do error boundaries catch?
A=Render-time errors in child component trees
B=All server 500 errors automatically
C=Every async promise rejection everywhere
D=CSS syntax only
answer=A
explanation=Error boundaries catch rendering lifecycle errors below them.
tags=react,errorboundary

@q
type=single
title=What is a common form validation approach?
A=Keep field state, validate on change/submit, show messages near fields
B=Only validate after deploy
C=Never store input values
D=Use keys as passwords
answer=A
explanation=Good forms keep feedback close and state explicit.
tags=react,forms

@q
type=boolean
title=Large components are often easier to test and maintain when split by responsibility.
answer=true
explanation=Smaller focused components reduce cognitive load.
tags=react,architecture

@q
type=single
title=Which value should usually be stable and unique for list keys?
A=Item id
B=Array index for every dynamic list
C=random() on each render
D=Current time
answer=A
explanation=Stable ids preserve identity across list changes.
tags=react,lists
```

## Java Concept Suites

```text
@suite
title=Java Part 1 - Syntax, Types and Control Flow
description=Train primitive/reference types, strings, arrays, conditions, loops and method basics.
duration=45

@q
type=single
title=Which of these is a Java primitive type?
A=String
B=Integer
C=int
D=ArrayList
answer=C
explanation=int is a primitive type.
tags=java,types

@q
type=boolean
title=String is a reference type in Java.
answer=true
explanation=String is a class.
tags=java,string

@q
type=single
title=Which method gets the length of a String?
A=length()
B=Length
C=count()
D=size
answer=A
explanation=String length is returned by length().
tags=java,string

@q
type=single
title=Which property gets the length of an array?
A=length
B=length()
C=Count
D=size()
answer=A
explanation=Arrays expose a length field.
tags=java,array

@q
type=boolean
title=Java uses == to compare String content reliably.
answer=false
explanation=Use equals for String content; == compares references.
tags=java,string

@q
type=single
title=Which loop is commonly used to iterate each item in a collection?
A=enhanced for loop
B=switch only
C=try only
D=package loop
answer=A
explanation=for (Type item : items) iterates each item.
tags=java,loops

@q
type=single
title=What is printed? int x = 2; System.out.println(x == 2);
A=true
B=false
C=2
D=Compile Error
answer=A
explanation=x equals 2.
tags=java,operators

@q
type=single
title=Which keyword returns a value from a method?
A=return
B=yieldonly
C=package
D=throws
answer=A
explanation=return exits the method and can return a value.
tags=java,methods

@q
type=boolean
title=A local variable must be definitely assigned before it is read.
answer=true
explanation=Java requires definite assignment for local variables.
tags=java,variables

@q
type=single
title=Which statement chooses among multiple constant-like cases?
A=switch
B=import
C=extends
D=final
answer=A
explanation=switch selects among cases.
tags=java,controlflow
```

```text
@suite
title=Java Part 2 - OOP, Collections and Exceptions
description=Train classes, constructors, inheritance, interfaces, ArrayList, HashMap, equals/hashCode and exceptions.
duration=55

@q
type=single
title=Which keyword creates inheritance between classes?
A=extends
B=implements
C=inherits
D=:
answer=A
explanation=Java classes extend a superclass.
tags=java,inheritance

@q
type=single
title=Which keyword connects a class to an interface?
A=implements
B=extends only
C=interfaceof
D=uses
answer=A
explanation=A class implements an interface.
tags=java,interface

@q
type=boolean
title=A Java class can implement multiple interfaces.
answer=true
explanation=Java supports multiple interface implementation.
tags=java,interface

@q
type=single
title=Which collection stores ordered resizable elements?
A=ArrayList
B=HashMap
C=Optional
D=Throwable
answer=A
explanation=ArrayList stores a resizable ordered list.
tags=java,collections

@q
type=single
title=Which collection stores key-value pairs?
A=HashMap
B=ArrayList
C=StringBuilder
D=LocalDate
answer=A
explanation=HashMap maps keys to values.
tags=java,collections

@q
type=single
title=Which method adds to an ArrayList?
A=add
B=pushBackOnly
C=put
D=setKey
answer=A
explanation=ArrayList.add appends an element.
tags=java,arraylist

@q
type=single
title=Which method inserts or replaces a HashMap value by key?
A=put
B=add
C=append
D=contains
answer=A
explanation=HashMap.put associates a key with a value.
tags=java,hashmap

@q
type=boolean
title=If you override equals, you should usually override hashCode too.
answer=true
explanation=Hash-based collections rely on the equals/hashCode contract.
tags=java,equals,hashcode

@q
type=single
title=Which block handles exceptions?
A=catch
B=finally only
C=package
D=static
answer=A
explanation=catch handles exceptions thrown in try.
tags=java,exceptions

@q
type=single
title=What does finally do?
A=Runs cleanup code after try/catch flow
B=Creates a generic type
C=Starts a stream
D=Overrides a method
answer=A
explanation=finally is commonly used for cleanup.
tags=java,exceptions
```

```text
@suite
title=Java Part 3 - Streams, Generics, Optional and Concurrency Basics
description=Train generics, streams, lambdas, Optional, immutability, threads, CompletableFuture and common pitfalls.
duration=60

@q
type=single
title=Why use List<String> instead of raw List?
A=Compile-time type safety
B=To disable iteration
C=To force all values to null
D=To make it synchronized automatically
answer=A
explanation=Generics let the compiler check element types.
tags=java,generics

@q
type=single
title=Which Stream operation filters elements?
A=filter
B=map
C=collect only
D=peek only
answer=A
explanation=filter keeps elements matching a predicate.
tags=java,streams

@q
type=single
title=Which Stream operation transforms elements?
A=map
B=filter
C=close
D=wait
answer=A
explanation=map converts each element to another value.
tags=java,streams

@q
type=boolean
title=Streams are often lazy until a terminal operation runs.
answer=true
explanation=Intermediate operations are evaluated when a terminal operation is invoked.
tags=java,streams,lazy

@q
type=single
title=Which method can collect a Stream into a List?
A=toList
B=asClass
C=runThread
D=throws
answer=A
explanation=Modern Java streams support toList(), and collectors can also collect to lists.
tags=java,streams

@q
type=single
title=What is Optional mainly used to represent?
A=A value that may or may not be present
B=A required synchronized lock
C=A primitive int wrapper only
D=A database table
answer=A
explanation=Optional makes absence explicit.
tags=java,optional

@q
type=boolean
title=Calling Optional.get without checking presence can throw.
answer=true
explanation=get throws if the Optional is empty.
tags=java,optional

@q
type=single
title=Which class represents an asynchronous result in modern Java?
A=CompletableFuture
B=ArrayDeque
C=StringJoiner
D=Scanner
answer=A
explanation=CompletableFuture models async computations.
tags=java,concurrency

@q
type=single
title=Why prefer immutable objects in concurrent code?
A=They reduce shared mutable state bugs
B=They run slower by definition
C=They require public fields
D=They disable generics
answer=A
explanation=Immutable data is safer to share across threads.
tags=java,concurrency,immutability

@q
type=boolean
title=Parallel streams are always faster than sequential streams.
answer=false
explanation=Parallel overhead and shared resources can make them slower or risky.
tags=java,streams,performance
```

## Coding Practice Suites

```text
@suite
title=C# Coding Set 1 - Strings and Collections
description=Implement focused C# functions over strings, lists and dictionaries.
duration=45

@q
type=coding
title=Normalize Name
description=Return the input name trimmed and converted to title case for two words. Example: "  leon wang " -> "Leon Wang".
problemId=csharp-normalize-name
tags=csharp,string

@q
type=coding
title=Count Words
description=Return a dictionary-like count of words, ignoring case and extra spaces.
problemId=csharp-word-count
tags=csharp,dictionary,string

@q
type=coding
title=Unique Sorted Numbers
description=Return unique integers sorted ascending from an input list.
problemId=csharp-unique-sorted
tags=csharp,list,linq
```

```text
@suite
title=C# Coding Set 2 - OOP and Async Shapes
description=Practice simple domain modeling and asynchronous method signatures.
duration=45

@q
type=coding
title=Invoice Total
description=Given line items with quantity and unit price, return the total rounded to two decimals.
problemId=csharp-invoice-total
tags=csharp,oop,decimal

@q
type=coding
title=Retry Counter
description=Given a sequence of success/failure booleans, return how many retries are needed before success.
problemId=csharp-retry-counter
tags=csharp,controlflow

@q
type=coding
title=Null Safe Full Name
description=Build a full name from nullable first and last names, trimming spaces and omitting missing parts.
problemId=csharp-null-safe-full-name
tags=csharp,nullability,string
```

```text
@suite
title=.NET Coding Set 1 - API and DTO Logic
description=Practice logic commonly found behind ASP.NET Core endpoints.
duration=45

@q
type=coding
title=Validate Create User Request
description=Return validation errors for missing email, short password or blank display name.
problemId=dotnet-validate-user-request
tags=dotnet,api,validation

@q
type=coding
title=Map Entity To DTO
description=Given a user entity with internal fields, return a public DTO shape without password hash.
problemId=dotnet-map-user-dto
tags=dotnet,dto

@q
type=coding
title=Choose Status Code
description=Given booleans for exists, authorized and valid, return the appropriate HTTP status code.
problemId=dotnet-status-code
tags=dotnet,http,api
```

```text
@suite
title=.NET Coding Set 2 - Data and Configuration Logic
description=Practice backend helper functions for EF-style filtering, paging and options.
duration=45

@q
type=coding
title=Apply Paging
description=Given page, pageSize and totalItems, return skip, take and totalPages.
problemId=dotnet-apply-paging
tags=dotnet,paging

@q
type=coding
title=Build Connection Label
description=Given environment and database name, return a safe display label without exposing secrets.
problemId=dotnet-connection-label
tags=dotnet,configuration

@q
type=coding
title=Summarize Health Checks
description=Given health check statuses, return Healthy, Degraded or Unhealthy using worst-status wins.
problemId=dotnet-health-summary
tags=dotnet,healthcheck
```

```text
@suite
title=React Coding Set 1 - State and Rendering Helpers
description=Implement pure helper functions used by React components.
duration=40

@q
type=coding
title=Toggle Selected Id
description=Given selected ids and a clicked id, return the next selected ids without mutating the original array.
problemId=react-toggle-selected-id
tags=react,state,array

@q
type=coding
title=Filter Visible Todos
description=Given todos and a filter of all, active or completed, return visible todos.
problemId=react-filter-visible-todos
tags=react,state

@q
type=coding
title=Build Class Name
description=Given base class and boolean flags, return a stable className string.
problemId=react-build-class-name
tags=react,jsx,ui
```

```text
@suite
title=React Coding Set 2 - Forms and Async UI Helpers
description=Practice validation and request-state helpers for React apps.
duration=40

@q
type=coding
title=Validate Signup Form
description=Return field errors for email, password and confirmPassword.
problemId=react-validate-signup
tags=react,forms,validation

@q
type=coding
title=Merge Server Patch
description=Given current form state and a server patch, return next state without mutating current state.
problemId=react-merge-server-patch
tags=react,state,immutability

@q
type=coding
title=Request Banner Text
description=Given loading, error and data flags, return the correct UI banner text.
problemId=react-request-banner
tags=react,datafetching
```

```text
@suite
title=Java Coding Set 1 - Strings and Collections
description=Implement Java functions over strings, arrays, lists and maps.
duration=45

@q
type=coding
title=Reverse Words
description=Reverse word order while trimming extra spaces. Example: "  hello   java " -> "java hello".
problemId=java-reverse-words
tags=java,string

@q
type=coding
title=Frequency Map
description=Return counts for each integer in the input array.
problemId=java-frequency-map
tags=java,hashmap,array

@q
type=coding
title=First Unique Character
description=Return the index of the first non-repeating character, or -1.
problemId=java-first-unique-char
tags=java,string,hashmap
```

```text
@suite
title=Java Coding Set 2 - Streams and Domain Logic
description=Practice stream-style transformations and simple business rules.
duration=45

@q
type=coding
title=Top Scores
description=Return the top N scores sorted descending without mutating the original input.
problemId=java-top-scores
tags=java,streams,sorting

@q
type=coding
title=Order Discount
description=Given subtotal and member level, return the discounted total rounded to cents.
problemId=java-order-discount
tags=java,domain,decimal

@q
type=coding
title=Safe Optional Display
description=Given nullable first and last names, return a clean display name or Anonymous.
problemId=java-safe-display-name
tags=java,optional,string
```
