# Things to Do
NOTE -- will start with heterosexual use case. 
Gay and lesbian rooms are easy. Including trans / NB
people will not be.
Primarily changes will need to occur in the entry queue
system and in the room matchmaker

## Date
1. ~~Propose date~~
2. ~~Accept / Record date between two users in room~~
3. ~~Propose setup~~
4. ~~Accept / Record setup between two users in room~~
5. ~~Review date / edit user score / release user~~
6. ^ edit user score when reviewing date
6. ~~Reject date~~
7. ~~View Proposed Dates~~

## Entry
1. Join entry queue
2. Gain priority in entry queue

## Global
1. Display potential room options (i.e., if you are a man seeking bio women,
trans women, and non-binary people, it offers you 3 room options, and
shows you how many people in each of those groups are seeking men)

## userGroup
1. ~~Generate new group (utility function)~~
2. ~~find closest group (utility function)~~

## Room
1. ~~Form room from available users~~
2. ^ for above: indicate users are not waiting
3. ^ for above: build in the ranking matchmaker
2. ~~Replace user in room (utility function)~~
3. ~~Display information required for a room interface~~

## User
1. ~~Create new user~~
2. ^ set user group
2. Set and switch descriptors
2. Upload photos and information
3. ~~Switch groups (3 days)~~
4. Switch groups (timeout) (utility function)
5. Switch groups (paid)
6. Log activity / time in (if timed out or temporarily suspended)
9. ~~Choose to join a new room (duplicate with form room from available users)~~

## Daemon
1. Find dormant users and temporarily disable them

## OTHER MACHINERY
### How are timeliness operations triggered?
1. A user in a "queue" to enter a room may be assigned to a room when either they
or someone else looks at the site / app. This re-runs a query to try to assign
them to a room.
2. A user who has gone dormant (no interaction with the app for more than a week) is
picked up by a daemon. If they choose to join a new room, they will be unmarked as dormant
and will be able to join rooms as normal